// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="../../runtime/jacdac-c/jacdac/spectool/jdspec.d.ts" />

import * as ts from "typescript"
import { SyntaxKind as SK } from "typescript"

import {
    SystemReg,
    SRV_JACSCRIPT_CONDITION,
    CloudAdapterEvent,
    CloudAdapterCmd,
    CloudAdapterCommandStatus,
} from "../../runtime/jacdac-c/jacdac/dist/specconstants"

import {
    read32,
    stringToUint8Array,
    toHex,
    toUTF8,
    write16,
    write32,
    strcmp,
    encodeU32LE,
    fromHex,
    bufferEq,
} from "./jdutil"

import {
    BinFmt,
    CellDebugInfo,
    ValueType,
    DebugInfo,
    FunctionDebugInfo,
    Host,
    OpCall,
    NumFmt,
    Op,
    RoleDebugInfo,
    SMap,
    ValueKind,
    JacsDiagnostic,
} from "./format"
import {
    addUnique,
    assert,
    assertRange,
    camelize,
    oops,
    snakify,
    strlen,
    upperCamel,
} from "./util"
import {
    bufferFmt,
    CachedValue,
    DelayedCodeSection,
    literal,
    Label,
    LOCAL_OFFSET,
    nonEmittable,
    OpWriter,
    SectionWriter,
    TopOpWriter,
    Value,
} from "./opwriter"
import { prelude } from "./prelude"
import { buildAST, formatDiagnostics, getProgramDiagnostics } from "./tsiface"

export const JD_SERIAL_HEADER_SIZE = 16
export const JD_SERIAL_MAX_PAYLOAD_SIZE = 236

export const CMD_GET_REG = 0x1000
export const CMD_SET_REG = 0x2000

class Cell {
    _index: number

    constructor(
        public definition:
            | ts.VariableDeclaration
            | ts.FunctionDeclaration
            | ts.ParameterDeclaration
            | ts.Identifier,
        public scope: VariableScope,
        public _name?: string
    ) {
        scope.add(this)
    }
    emit(wr: OpWriter): Value {
        oops("on value() on generic Cell")
    }
    store(wr: OpWriter, src: Value) {
        oops("on storeInto() on generic Cell")
    }
    canStore() {
        return false
    }
    getName() {
        if (!this._name) {
            if (ts.isIdentifier(this.definition))
                this._name = idName(this.definition)
            else this._name = idName(this.definition.name)
        }
        return this._name
    }
    debugInfo(): CellDebugInfo {
        return {
            name: this.getName(),
        }
    }
}

class Role extends Cell {
    dispatcher: {
        proc: Procedure
        top: Label
        init: DelayedCodeSection
        checkConnected: DelayedCodeSection
        connected: DelayedCodeSection
        disconnected: DelayedCodeSection
        wasConnected: Variable
    }
    autoRefreshRegs: jdspec.PacketInfo[] = []
    stringIndex: number
    used = false

    constructor(
        prog: Program,
        definition: ts.VariableDeclaration | ts.Identifier,
        scope: VariableScope,
        public spec: jdspec.ServiceSpec,
        _name?: string
    ) {
        super(definition, scope, _name)
        assert(!!spec, "no spec " + this._name)
        this.stringIndex = prog.addString(this.getName())
    }
    emit(wr: OpWriter): Value {
        const r = wr.emitExpr(Op.EXPRx_STATIC_ROLE, literal(this._index))
        r.valueType = ValueType.ROLE(this.spec)
        va(r).role = this
        this.used = true
        return r
    }
    serialize() {
        const r = new Uint8Array(BinFmt.ROLE_HEADER_SIZE)
        write32(r, 0, this.spec.classIdentifier)
        write16(r, 4, this.stringIndex)
        return r
    }
    toString() {
        return `role ${this.getName()}`
    }
    isSensor() {
        return this.spec.packets.some(
            p => p.identifier == SystemReg.StreamingSamples
        )
    }
    isCondition() {
        return this.spec.classIdentifier == SRV_JACSCRIPT_CONDITION
    }
    debugInfo(): RoleDebugInfo {
        return {
            ...super.debugInfo(),
            serviceClass: this.spec.classIdentifier,
        }
    }
}

class Variable extends Cell {
    isLocal = false
    isParameter = false

    constructor(
        definition: ts.VariableDeclaration | ts.ParameterDeclaration,
        scope: VariableScope,
        public valueType: ValueType,
        name?: string
    ) {
        super(definition, scope, name)
    }
    emit(wr: OpWriter): Value {
        const r = this.isParameter
            ? wr.emitMemRef(Op.EXPRx_LOAD_PARAM, this._index, this.valueType)
            : this.isLocal
            ? wr.emitMemRef(
                  Op.EXPRx_LOAD_LOCAL,
                  this._index + LOCAL_OFFSET,
                  this.valueType
              )
            : wr.emitMemRef(Op.EXPRx_LOAD_GLOBAL, this._index, this.valueType)
        va(r).variable = this
        return r
    }
    canStore() {
        return true
    }
    store(wr: OpWriter, src: Value) {
        if (this.valueType == ValueType.ANY) this.valueType = src.valueType
        if (this.isParameter)
            wr.emitStmt(Op.STMTx1_STORE_PARAM, literal(this._index), src)
        else if (this.isLocal)
            wr.emitStmt(
                Op.STMTx1_STORE_LOCAL,
                literal(this._index + LOCAL_OFFSET),
                src
            )
        else wr.emitStmt(Op.STMTx1_STORE_GLOBAL, literal(this._index), src)
    }
    toString() {
        return `var ${this.getName()} : ${this.valueType}`
    }
}

class BufferLit extends Cell {
    constructor(
        definition: ts.VariableDeclaration,
        scope: VariableScope,
        public litValue: Uint8Array
    ) {
        super(definition, scope)
    }
    emit(wr: OpWriter): Value {
        return wr.emitString(this.litValue)
    }
    toString() {
        return `bufferLit ${this.getName()}`
    }
}

class FunctionDecl extends Cell {
    proc: Procedure
    constructor(definition: ts.FunctionDeclaration, scope: VariableScope) {
        super(definition, scope)
    }
    emit(wr: OpWriter): Value {
        const r = literal(this._index)
        va(r).fun = this
        return r
    }
    toString() {
        return `function ${this.getName()}`
    }
}

class ValueAdd {
    index: number
    roleExpr?: Value
    role?: Role
    variable?: Variable
    clientCommand?: ClientCommand
    fun?: FunctionDecl
    litValue?: number
}

function va(v: Value) {
    if (!v._userdata) v._userdata = new ValueAdd()
    return v._userdata as ValueAdd
}

function cellKind(v: Value): ValueType {
    return v.valueType
}

function idName(pat: ts.Expression | ts.DeclarationName) {
    if (ts.isIdentifier(pat)) return pat.text
    else return null
}

function matchesName(specName: string, jsName: string) {
    return camelize(specName) == jsName
}

function unit() {
    return nonEmittable(ValueType.VOID)
}

const reservedFunctions: SMap<number> = {
    wait: 1,
    every: 1,
    upload: 1,
    print: 1,
    format: 1,
    panic: 1,
    reboot: 1,
    isNaN: 1,
    onStart: 1,
    buffer: 1,
}

class Procedure {
    writer: OpWriter
    index: number
    params: VariableScope
    locals: VariableScope
    methodSeqNo: Variable
    constructor(public parent: Program, public name: string) {
        this.index = this.parent.procs.length
        this.writer = new OpWriter(parent, `${this.name}_F${this.index}`)
        this.parent.procs.push(this)
        this.params = new VariableScope(this.parent.globals)
        this.locals = new VariableScope(this.params)
    }
    get numargs() {
        return this.params.list.length
    }
    toString() {
        return this.writer.getAssembly()
    }
    finalize() {
        this.writer.patchLabels()
    }
    args() {
        return this.params.list.slice() as Variable[]
    }
    mkTempLocal(name: string, tp: ValueType) {
        const l = new Variable(null, this.locals, tp)
        l._name = name
        l.isLocal = true
        return l
    }
    debugInfo(): FunctionDebugInfo {
        this.writer._forceFinStmt()
        return {
            name: this.name,
            srcmap: this.writer.srcmap,
            locals: this.params.list
                .concat(this.locals.list)
                .map(v => v.debugInfo()),
        }
    }

    reference(wr: OpWriter) {
        return wr.emitExpr(Op.EXPRx_STATIC_FUNCTION, literal(this.index))
    }

    callMe(wr: OpWriter, args: CachedValue[], op = OpCall.SYNC) {
        wr._emitCall(this.reference(wr), args, op)
    }
}

class VariableScope {
    map: SMap<Cell> = {}
    list: Cell[] = []
    constructor(public parent: VariableScope) {}

    lookup(name: string): Cell {
        if (name == null) return undefined
        if (this.map.hasOwnProperty(name)) return this.map[name]
        if (this.parent) return this.parent.lookup(name)
        return undefined
    }

    _addToMap(cell: Cell) {
        this.map[cell.getName()] = cell
    }

    add(cell: Cell) {
        cell._index = this.list.length
        this.list.push(cell)
        if (cell.definition || cell._name) this._addToMap(cell)
    }

    describeIndex(idx: number) {
        const v = this.list[idx]
        if (v) return v.getName()
        return undefined
    }

    sort() {
        this.list.sort((a, b) => strcmp(a.getName(), b.getName()))
        for (let i = 0; i < this.list.length; ++i) this.list[i]._index = i
    }
}

enum RefreshMS {
    Never = 0,
    Normal = 500,
    Slow = 5000,
}

type Expr = ts.Expression
type Stmt = ts.Statement
type FunctionLike =
    | ts.FunctionDeclaration
    | ts.ArrowFunction
    | ts.FunctionExpression

const mathConst: SMap<number> = {
    E: Math.E,
    PI: Math.PI,
    LN10: Math.LN10,
    LN2: Math.LN2,
    LOG2E: Math.LOG2E,
    LOG10E: Math.LOG10E,
    SQRT1_2: Math.SQRT1_2,
    SQRT2: Math.SQRT2,
}

function throwError(expr: ts.Node, msg: string): never {
    const err = new Error(msg)
    // console.log(err.stack)
    ;(err as any).sourceNode = expr
    throw err
}

interface LoopLabels {
    continueLbl: Label
    breakLbl: Label
}

class ClientCommand {
    defintion: ts.FunctionExpression
    jsName: string
    pktSpec: jdspec.PacketInfo
    isFresh: boolean
    proc: Procedure
    constructor(public serviceSpec: jdspec.ServiceSpec) {}
}

interface Position {
    range?: [number, number]
    rangeFile?: string
}

class Program implements TopOpWriter {
    bufferLits = new VariableScope(null)
    roles = new VariableScope(this.bufferLits)
    functions = new VariableScope(null)
    globals = new VariableScope(this.roles)
    tree: ts.Program
    mainFile: ts.SourceFile
    procs: Procedure[] = []
    floatLiterals: number[] = []
    stringLiterals: (string | Uint8Array)[] = []
    writer: OpWriter
    proc: Procedure
    sysSpec: jdspec.ServiceSpec
    serviceSpecs: Record<string, jdspec.ServiceSpec>
    enums: Record<string, jdspec.EnumInfo> = {}
    clientCommands: Record<string, ClientCommand[]> = {}
    refreshMS: number[] = [0, 500]
    resolverParams: number[]
    resolverPC: number
    numErrors = 0
    main: Procedure
    cloudRole: Role
    cloudMethod429: Label
    cloudMethodDispatcher: DelayedCodeSection
    startDispatchers: DelayedCodeSection
    onStart: DelayedCodeSection
    loopStack: LoopLabels[] = []
    isLibrary = false
    compileAll = false

    constructor(public host: Host, public _source: string) {
        this.serviceSpecs = {}
        for (const sp of host.getSpecs()) {
            this.serviceSpecs[sp.camelName] = sp
            for (const en of Object.keys(sp.enums)) {
                const n = upperCamel(sp.camelName) + upperCamel(en)
                this.enums[n] = sp.enums[en]
            }
        }
        this.sysSpec = this.serviceSpecs["system"]
    }

    get hasErrors() {
        return this.numErrors > 0
    }

    getSource(fn: string) {
        if (!fn || fn == this.host.mainFileName?.()) return this._source
        return prelude[fn] || ""
    }

    addString(str: string | Uint8Array) {
        if (typeof str == "string") return addUnique(this.stringLiterals, str)
        else {
            for (let i = 0; i < this.stringLiterals.length; ++i) {
                const ss = this.stringLiterals[i]
                if (typeof ss != "string" && bufferEq(str, ss)) return i
            }
            this.stringLiterals.push(str)
            return this.stringLiterals.length - 1
        }
    }

    addFloat(f: number): number {
        return addUnique(this.floatLiterals, f)
    }

    indexToLine(node: ts.Node) {
        const { line } = ts.getLineAndCharacterOfPosition(
            node.getSourceFile(),
            node.getStart()
        )
        return line + 1
    }

    printDiag(diag: ts.Diagnostic) {
        if (diag.category == ts.DiagnosticCategory.Error) this.numErrors++
        if (this.host.error) this.host.error(diag)
        else console.error(formatDiagnostics([diag]))
    }

    reportError(node: ts.Node, msg: string): Value {
        ts.createSemanticDiagnosticsBuilderProgram
        const diag: ts.Diagnostic = {
            category: ts.DiagnosticCategory.Error,
            messageText: msg,
            code: 9999,
            file: node.getSourceFile(),
            start: node.getStart(),
            length: node.getWidth(),
        }
        this.printDiag(diag)
        return nonEmittable(ValueType.ERROR)
    }

    describeCell(ff: string, idx: number): string {
        switch (ff) {
            case "R":
                return this.roles.describeIndex(idx)
            case "S":
                const l = this.stringLiterals[idx]
                if (typeof l == "string") return JSON.stringify(l)
                else return toHex(l)
            case "P":
                return "" // param
            case "L":
                return "" // local
            case "G":
                return this.globals.describeIndex(idx)
            case "D":
                return this.floatLiterals[idx] + ""
            case "F":
                return this.procs[idx]?.name
        }
    }

    private roleDispatcher(role: Role) {
        if (!role.dispatcher) {
            const proc = new Procedure(this, role.getName() + "_disp")
            role.dispatcher = {
                proc,
                top: proc.writer.mkLabel("disp_top"),
                init: new DelayedCodeSection("init", proc.writer),
                disconnected: new DelayedCodeSection(
                    "disconnected",
                    proc.writer
                ),
                connected: new DelayedCodeSection("connected", proc.writer),
                checkConnected: new DelayedCodeSection(
                    "checkConnected",
                    proc.writer
                ),
                wasConnected: proc.mkTempLocal(
                    "connected_" + role.getName(),
                    ValueType.BOOL
                ),
            }
            this.withProcedure(proc, wr => {
                this.emitStore(
                    role.dispatcher.wasConnected,
                    this.emitIsRoleConnected(role)
                )
                role.dispatcher.init.callHere()
                wr.emitLabel(role.dispatcher.top)
                wr.emitStmt(Op.STMT1_WAIT_ROLE, role.emit(wr))
                role.dispatcher.checkConnected.callHere()
            })

            this.startDispatchers.emit(wr => {
                // this is only executed once, but with BG_MAX1 is easier to naively analyze memory usage
                proc.callMe(wr, [], OpCall.BG_MAX1)
            })
        }
        return role.dispatcher
    }

    private finalizeDispatchers() {
        for (const role of this.roles.list) {
            const disp = (role as Role).dispatcher
            if (disp)
                this.withProcedure(disp.proc, wr => {
                    // forever!
                    wr.emitJump(disp.top)

                    // run init
                    disp.init.finalize()

                    // if any dis/connect handlers, do the checking
                    if (!disp.connected.empty() || !disp.disconnected.empty()) {
                        disp.checkConnected.body.push(wr => {
                            const connNow = this.emitIsRoleConnected(
                                role as Role
                            )
                            const nowDis = wr.mkLabel("nowDis")
                            wr.emitJump(nowDis, connNow)

                            {
                                // now==connected
                                if (!disp.connected.empty()) {
                                    wr.emitJump(
                                        disp.checkConnected.returnLabel,
                                        wr.emitExpr(
                                            Op.EXPR1_NOT,
                                            disp.wasConnected.emit(wr)
                                        )
                                    )
                                    // prev==disconnected

                                    disp.connected.finalizeRaw()
                                }
                                this.emitStore(disp.wasConnected, literal(1))
                                wr.emitJump(disp.checkConnected.returnLabel)
                            }

                            {
                                wr.emitLabel(nowDis)
                                // now==disconnected
                                if (!disp.disconnected.empty()) {
                                    wr.emitJump(
                                        disp.checkConnected.returnLabel,
                                        disp.wasConnected.emit(wr)
                                    )
                                    // prev==connected
                                    disp.disconnected.finalizeRaw()
                                }
                                this.emitStore(disp.wasConnected, literal(0))
                                wr.emitJump(disp.checkConnected.returnLabel)
                            }
                        })
                    }

                    // either way, finalize checkConnected
                    disp.checkConnected.finalize()
                })
        }
    }

    private finalizeAutoRefresh() {
        const proc = new Procedure(this, "_autoRefresh_")
        const period = 521
        this.withProcedure(proc, wr => {
            for (const role_ of this.roles.list) {
                const role = role_ as Role
                if (role.autoRefreshRegs.length == 0) continue
                const isConn = this.emitIsRoleConnected(role)
                wr.emitIfAndPop(isConn, () => {
                    for (const reg of role.autoRefreshRegs) {
                        if (
                            reg.identifier == SystemReg.Reading &&
                            role.isSensor()
                        ) {
                            wr.emitSetBuffer(new Uint8Array([199]))
                            this.emitSendCommand(
                                role,
                                SystemReg.StreamingSamples | CMD_SET_REG
                            )
                        } else {
                            wr.emitStmt(Op.STMT1_SETUP_PKT_BUFFER, literal(0))
                            this.emitSendCommand(
                                role,
                                reg.identifier | CMD_GET_REG
                            )
                        }
                    }
                })
            }
            wr.emitStmt(Op.STMT1_SLEEP_MS, literal(period))
            wr.emitJump(wr.top)
        })

        this.startDispatchers.emit(wr => proc.callMe(wr, [], OpCall.BG_MAX1))
    }

    private withProcedure<T>(proc: Procedure, f: (wr: OpWriter) => T) {
        assert(!!proc)
        const prevProc = this.proc
        try {
            this.proc = proc
            this.writer = proc.writer
            return f(proc.writer)
        } finally {
            this.proc = prevProc
            if (prevProc) this.writer = prevProc.writer
        }
    }

    private forceName(pat: ts.Expression | ts.DeclarationName) {
        const r = idName(pat)
        if (!r) throwError(pat, "only simple identifiers supported")
        return r
    }

    private lookupRoleSpec(expr: ts.Node, serv: string) {
        const r = this.serviceSpecs.hasOwnProperty(serv)
            ? this.serviceSpecs[serv]
            : undefined
        if (!r) throwError(expr, "no such service: " + serv)
        return r
    }

    private parseRole(decl: ts.VariableDeclaration): Cell {
        const expr = decl.initializer

        const buflit = this.bufferLiteral(expr)
        if (buflit) return new BufferLit(decl, this.bufferLits, buflit)

        if (!expr || !ts.isCallExpression(expr)) return null

        switch (idName(expr.expression)) {
            case "condition":
                this.requireArgs(expr, 0)
                return new Role(
                    this,
                    decl,
                    this.roles,
                    this.serviceSpecs["jacscriptCondition"]
                )
        }
        if (!ts.isPropertyAccessExpression(expr.expression)) return null
        if (idName(expr.expression.expression) != "roles") return null
        const spec = this.lookupRoleSpec(
            expr.expression,
            this.forceName(expr.expression.name)
        )
        this.requireArgs(expr, 0)
        return new Role(this, decl, this.roles, spec)
    }

    private emitStore(trg: Variable, src: Value) {
        trg.store(this.writer, src)
    }

    private newDef(decl: ts.NamedDeclaration) {
        const id = this.forceName(decl.name)
        if (
            this.roles.lookup(id) ||
            (this.proc?.locals || this.globals).lookup(id) ||
            this.functions.lookup(id)
        )
            throwError(decl, `name '${id}' already defined`)
    }

    private emitVariableDeclaration(decls: ts.VariableStatement) {
        // if (decls.kind != "var") throwError(decls, "only 'var' supported")
        for (const decl of decls.declarationList.declarations) {
            let g: Variable
            if (this.isTopLevel(decl)) {
                const tmp = this.globals.lookup(this.forceName(decl.name))
                if (tmp instanceof Role) continue
                if (tmp instanceof BufferLit) continue
                if (tmp instanceof Variable) g = tmp
                else {
                    if (this.numErrors == 0) oops("invalid var: " + tmp)
                    else continue
                }
            } else {
                this.newDef(decl)
                g = new Variable(decl, this.proc.locals, ValueType.ANY)
                g.isLocal = true
            }

            if (decl.initializer) {
                const v = this.emitSimpleValue(decl.initializer, ValueType.ANY)
                g.valueType = v.valueType
                this.emitStore(g, v)
            }
        }
    }

    private emitIfStatement(stmt: ts.IfStatement) {
        const cond = this.emitSimpleValue(stmt.expression, ValueType.BOOL)
        if (cond.isLiteral) {
            if (cond.numValue) this.emitStmt(stmt.thenStatement)
            else {
                if (stmt.elseStatement) this.emitStmt(stmt.elseStatement)
            }
        } else {
            this.writer.emitIfAndPop(
                cond,
                () => this.emitStmt(stmt.thenStatement),
                stmt.elseStatement
                    ? () => this.emitStmt(stmt.elseStatement)
                    : null
            )
        }
    }

    private emitWhileStatement(stmt: ts.WhileStatement) {
        const wr = this.writer

        const continueLbl = wr.mkLabel("whileCont")
        const breakLbl = wr.mkLabel("whileBrk")

        wr.emitLabel(continueLbl)
        const cond = this.emitSimpleValue(stmt.expression, ValueType.BOOL)
        wr.emitJump(breakLbl, cond)

        try {
            this.loopStack.push({ continueLbl, breakLbl })
            this.emitStmt(stmt.statement)
        } finally {
            this.loopStack.pop()
        }

        wr.emitJump(continueLbl)
        wr.emitLabel(breakLbl)
    }

    private emitAckCloud(
        code: CloudAdapterCommandStatus,
        isOuter: boolean,
        args: Expr[] = []
    ) {
        const wr = this.writer
        wr.allocBuf()
        {
            const tmp = isOuter
                ? wr.emitBufLoad(NumFmt.U32, 0)
                : wr.emitMemRef(Op.EXPRx_LOAD_PARAM, 0, ValueType.NUMBER)
            wr.emitStmt(Op.STMT1_SETUP_PKT_BUFFER, literal(8 + args.length * 8))
            wr.emitBufStore(tmp, NumFmt.U32, 0)
            wr.emitBufStore(literal(code), NumFmt.U32, 4)
        }
        let off = 8
        for (const arg of args) {
            const v = this.emitSimpleValue(arg)
            wr.emitBufStore(v, NumFmt.F64, off)
            off += 8
        }
        wr.freeBuf()
        this.emitSendCommand(this.cloudRole, CloudAdapterCmd.AckCloudCommand)
    }

    private emitReturnStatement(stmt: ts.ReturnStatement) {
        const wr = this.writer
        if (this.proc.methodSeqNo) {
            let args: Expr[] = []
            if (
                stmt.expression &&
                ts.isArrayLiteralExpression(stmt.expression)
            ) {
                args = stmt.expression.elements.slice()
            } else if (stmt.expression) {
                args = [stmt.expression]
            }
            this.emitAckCloud(CloudAdapterCommandStatus.OK, false, args)
            wr.emitStmt(Op.STMT1_RETURN, literal(null))
        } else if (stmt.expression) {
            if (wr.ret) oops("return with value not supported here")
            wr.emitStmt(Op.STMT1_RETURN, this.emitSimpleValue(stmt.expression))
        } else {
            if (wr.ret) this.writer.emitJump(this.writer.ret)
            else wr.emitStmt(Op.STMT1_RETURN, literal(null))
        }
    }

    private specFromTypeName(expr: ts.Node, tp: string) {
        if (tp.endsWith("Role") && tp[0].toUpperCase() == tp[0]) {
            let r = tp.slice(0, -4)
            r = r[0].toLowerCase() + r.slice(1)
            return this.lookupRoleSpec(expr, r)
        } else {
            throwError(expr, "type name not understood: " + tp)
        }
    }

    private emitFunctionBody(
        stmt: ts.FunctionDeclaration | ts.FunctionExpression,
        proc: Procedure
    ) {
        this.emitStmt(stmt.body)
        this.writer.emitStmt(Op.STMT1_RETURN, literal(null))
    }

    private addParameter(
        proc: Procedure,
        id: ts.ParameterDeclaration | string
    ) {
        const v = new Variable(
            typeof id == "string" ? null : id,
            proc.params,
            ValueType.NUMBER
        )
        if (typeof id == "string") v._name = id
        v.isLocal = true
        v.isParameter = true
        return v
    }

    private emitParameters(stmt: FunctionLike, proc: Procedure) {
        for (const paramdef of stmt.parameters) {
            if (!idName(paramdef.name))
                throwError(
                    paramdef,
                    "only simple identifiers supported as parameters"
                )

            const v = this.addParameter(proc, paramdef)

            let tp = ""
            if (paramdef.type) tp = paramdef.type.getText()

            if (tp == "" || tp == "number") {
                // OK!
            } else if (tp == "boolean") {
                v.valueType = ValueType.BOOL
            } else if (tp == "JDBuffer") {
                v.valueType = ValueType.BUFFER
            } else {
                v.valueType = ValueType.ROLE(
                    this.specFromTypeName(paramdef, tp)
                )
            }
        }
    }

    private getClientCommandProc(cc: ClientCommand) {
        if (cc.proc) return cc.proc

        const stmt = cc.defintion
        cc.proc = new Procedure(
            this,
            cc.serviceSpec.camelName + "." + cc.jsName
        )

        this.withProcedure(cc.proc, wr => {
            const v = new Variable(
                null,
                cc.proc.params,
                ValueType.ROLE(cc.serviceSpec),
                "this"
            )
            v.isLocal = true
            v.isParameter = true
            this.emitParameters(stmt, cc.proc)
            this.emitFunctionBody(stmt, cc.proc)
        })

        return cc.proc
    }

    private getFunctionProc(fundecl: FunctionDecl) {
        if (fundecl.proc) return fundecl.proc
        const stmt = fundecl.definition as ts.FunctionDeclaration

        fundecl.proc = new Procedure(this, fundecl.getName())

        this.withProcedure(fundecl.proc, wr => {
            this.emitParameters(stmt, fundecl.proc)
            this.emitFunctionBody(stmt, fundecl.proc)
        })

        return fundecl.proc
    }

    private emitFunctionDeclaration(stmt: ts.FunctionDeclaration) {
        const fundecl = this.functions.list.find(
            f => f.definition === stmt
        ) as FunctionDecl
        if (!this.isTopLevel(stmt))
            throwError(stmt, "only top-level functions are supported")
        if (stmt.modifiers?.length || stmt.asteriskToken)
            throwError(stmt, "async not supported")
        assert(!!fundecl || !!this.numErrors)

        if (fundecl) {
            if (this.compileAll || (this.isLibrary && this.inMainFile(stmt)))
                this.getFunctionProc(fundecl)
        }
    }

    private isTopLevel(node: ts.Node) {
        return !!(node as any)._jacsIsTopLevel
    }

    private emitProgram(prog: ts.Program) {
        this.main = new Procedure(this, "main")

        this.startDispatchers = new DelayedCodeSection(
            "startDispatchers",
            this.main.writer
        )
        this.onStart = new DelayedCodeSection("onStart", this.main.writer)

        const stmts = ([] as ts.Statement[]).concat(
            ...prog
                .getSourceFiles()
                .map(file => (file.isDeclarationFile ? [] : file.statements))
        )

        stmts.forEach(markTopLevel)

        // pre-declare all functions and globals
        for (const s of stmts) {
            try {
                if (ts.isFunctionDeclaration(s)) {
                    this.newDef(s)
                    const n = this.forceName(s.name)
                    if (reservedFunctions[n] == 1)
                        throwError(s, `function name '${n}' is reserved`)
                    new FunctionDecl(s, this.functions)
                } else if (ts.isVariableStatement(s)) {
                    for (const decl of s.declarationList.declarations) {
                        this.newDef(decl)
                        if (!this.parseRole(decl)) {
                            new Variable(decl, this.globals, ValueType.ANY)
                        }
                    }
                }
            } catch (e) {
                this.handleException(s, e)
            }
        }

        this.roles.sort()

        // make sure the cloud role is last
        this.cloudRole = new Role(
            this,
            null,
            this.roles,
            this.serviceSpecs["cloudAdapter"],
            "cloud"
        )

        this.withProcedure(this.main, () => {
            this.startDispatchers.callHere()
            for (const s of stmts) this.emitStmt(s)
            this.onStart.finalizeRaw()
            this.writer.emitStmt(Op.STMT1_RETURN, literal(0))
            this.finalizeAutoRefresh()
            this.startDispatchers.finalize()
        })

        if (!this.cloudRole.used) {
            const cl = this.roles.list.pop()
            assert(cl == this.cloudRole)
        }

        function markTopLevel(node: ts.Node) {
            ;(node as any)._jacsIsTopLevel = true
            if (ts.isExpressionStatement(node)) markTopLevel(node.expression)
            else if (ts.isVariableStatement(node))
                node.declarationList.declarations.forEach(markTopLevel)
        }
    }

    private ignore(val: Value) {
        val.adopt()
    }

    private emitExpressionStatement(stmt: ts.ExpressionStatement) {
        this.ignore(this.emitExpr(stmt.expression))
        this.writer.assertNoTemps()
    }

    private emitHandler(
        name: string,
        func: Expr,
        options: {
            every?: number
            methodHandler?: boolean
        } = {}
    ): Procedure {
        if (!ts.isArrowFunction(func))
            throwError(func, "arrow function expected here")
        const proc = new Procedure(this, name)
        proc.writer.ret = proc.writer.mkLabel("ret")
        if (func.parameters.length && !options.methodHandler)
            throwError(func, "parameters not supported here")
        this.withProcedure(proc, wr => {
            if (options.methodHandler)
                proc.methodSeqNo = this.addParameter(proc, "methSeqNo")
            this.emitParameters(func, proc)
            if (options.every) {
                wr.emitStmt(Op.STMT1_SLEEP_MS, literal(options.every))
            }
            if (ts.isBlock(func.body)) {
                this.emitStmt(func.body)
            } else {
                this.ignore(this.emitExpr(func.body))
            }
            wr.emitLabel(wr.ret)
            if (options.every) wr.emitJump(wr.top)
            else {
                if (options.methodHandler)
                    this.emitAckCloud(CloudAdapterCommandStatus.OK, false, [])
                wr.emitStmt(Op.STMT1_RETURN, literal(null))
            }
        })
        return proc
    }

    private codeName(node: ts.Node) {
        return node
            .getText()
            .slice(0, 30)
            .replace(/[^a-zA-Z0-9_]+/g, "_")
    }

    private requireArgsExt(node: ts.Node, args: Expr[], num: number) {
        if (args.length != num)
            throwError(node, `${num} arguments required; got ${args.length}`)
    }

    private requireArgs(expr: ts.CallExpression, num: number) {
        this.requireArgsExt(expr, expr.arguments.slice(), num)
    }

    private emitInRoleDispatcher(role: Role, f: (wr: OpWriter) => void) {
        const disp = this.roleDispatcher(role)
        this.withProcedure(disp.proc, f)
    }

    private requireTopLevel(expr: ts.CallExpression) {
        if (!this.isTopLevel(expr))
            throwError(
                expr,
                "this can only be done at the top-level of the program"
            )
    }

    private emitEventHandler(
        name: string,
        handlerExpr: Expr,
        role: Role,
        code: number
    ) {
        const handler = this.emitHandler(name, handlerExpr)
        this.emitInRoleDispatcher(role, wr => {
            const cond = wr.emitExpr(
                Op.EXPR2_EQ,
                wr.emitExpr(Op.EXPR0_PKT_EV_CODE),
                literal(code)
            )
            wr.emitIfAndPop(cond, () =>
                handler.callMe(wr, [], OpCall.BG_MAX1_PEND1)
            )
        })
    }

    private emitEventCall(
        expr: ts.CallExpression,
        val: Value,
        prop: string
    ): Value {
        assert(val.valueType.kind == ValueKind.JD_EVENT)
        const wr = this.writer
        switch (prop) {
            case "subscribe":
                this.requireTopLevel(expr)
                this.requireArgs(expr, 1)
                this.ignore(val)
                this.emitEventHandler(
                    this.codeName(expr.expression),
                    expr.arguments[0],
                    this.roleOf(expr.expression, val),
                    val.valueType.packetSpec.identifier
                )
                return unit()
            case "wait":
                this.requireArgs(expr, 0)
                const lbl = wr.mkLabel("wait")
                wr.emitLabel(lbl)
                wr.emitStmt(Op.STMT1_WAIT_ROLE, this.roleExprOf(expr, val))
                const cond = wr.emitExpr(
                    Op.EXPR2_EQ,
                    wr.emitExpr(Op.EXPR0_PKT_EV_CODE),
                    literal(val.valueType.packetSpec.identifier)
                )
                wr.emitJump(lbl, cond)
                return unit()
        }
        throwError(expr, `events don't have property ${prop}`)
    }

    private extractRegField(
        spec: jdspec.PacketInfo,
        field: jdspec.PacketMember
    ) {
        const wr = this.writer
        let off = 0
        for (const f of spec.fields) {
            if (f == field) {
                return wr.emitBufLoad(bufferFmt(field), off)
            } else {
                off += Math.abs(f.storage)
            }
        }
        oops("field missing")
    }

    private emitRegGet(
        val: Value,
        refresh?: RefreshMS,
        field?: jdspec.PacketMember
    ) {
        assert(val.valueType.kind == ValueKind.JD_REG)
        const spec = val.valueType.packetSpec
        if (refresh === undefined)
            refresh = spec.kind == "const" ? RefreshMS.Never : RefreshMS.Normal
        if (!field && spec.fields.length == 1) field = spec.fields[0]

        const wr = this.writer
        wr.emitStmt(
            Op.STMT3_QUERY_REG,
            va(val).roleExpr,
            literal(spec.identifier),
            literal(refresh)
        )
        if (field) {
            return this.extractRegField(spec, field)
        } else {
            const r = nonEmittable(
                new ValueType(
                    ValueKind.JD_VALUE_SEQ,
                    val.valueType.roleSpec,
                    spec
                )
            )
            va(r).role = va(val).role
            return r
        }
    }

    private emitIsRoleConnected(val: Value | Role) {
        if (val instanceof Role) val = val.emit(this.writer)
        return this.writer.emitExpr(Op.EXPR1_ROLE_IS_CONNECTED, val)
    }

    private roleExprOf(expr: Expr, val: Value) {
        const vobj = va(val)
        if (vobj.roleExpr) val = vobj.roleExpr
        if (!val.valueType.isRole)
            throwError(expr, `a role expression is required here`)
        return val
    }

    private roleOf(expr: Expr, val: Value) {
        let vobj = va(this.roleExprOf(expr, val))
        if (!vobj.role) throwError(expr, `a static role is required here`)
        return vobj.role
    }

    private emitRoleCall(
        expr: ts.CallExpression,
        val: Value,
        prop: string
    ): Value {
        const wr = this.writer
        if (!ts.isPropertyAccessExpression(expr.expression)) oops("")
        switch (prop) {
            case "isConnected":
                this.requireArgs(expr, 0)
                return this.emitIsRoleConnected(val)
            case "onConnected":
            case "onDisconnected": {
                this.requireTopLevel(expr)
                this.requireArgs(expr, 1)
                const role = this.roleOf(expr, val)
                const name = role.getName() + "_" + prop
                const handler = this.emitHandler(name, expr.arguments[0])
                const disp = this.roleDispatcher(role)
                const section =
                    prop == "onConnected" ? disp.connected : disp.disconnected
                section.emit(wr => {
                    handler.callMe(wr, [], OpCall.BG_MAX1_PEND1)
                })
                if (prop == "onConnected")
                    disp.init.emit(wr => {
                        wr.emitIfAndPop(disp.wasConnected.emit(wr), () => {
                            handler.callMe(wr, [], OpCall.BG_MAX1)
                        })
                    })
                return unit()
            }
            case "wait": {
                const role = this.roleOf(expr, val)
                if (!role.isCondition())
                    throwError(expr, "only condition()s have wait()")
                this.requireArgs(expr, 0)
                wr.emitStmt(Op.STMT1_WAIT_ROLE, role.emit(wr))
                return unit()
            }
            default:
                const v = this.emitRoleMember(expr.expression, val)
                const k = v.valueType.kind
                if (k == ValueKind.JD_CLIENT_COMMAND) {
                    this.ignore(val)
                    return this.emitProcCall(
                        expr,
                        this.getClientCommandProc(va(v).clientCommand),
                        true
                    )
                } else if (k == ValueKind.JD_COMMAND) {
                    const spec = v.valueType.packetSpec
                    this.emitPackArgs(expr, spec)
                    this.emitSendCommand(val, spec.identifier)
                } else if (k != ValueKind.ERROR) {
                    throwError(expr, `${v.valueType} cannot be called`)
                }
                return unit()
        }
    }

    private parseFormat(expr: Expr): NumFmt {
        const str = this.stringLiteral(expr) || ""
        const m = /^([uif])(\d+)(\.\d+)?$/.exec(str.trim())
        if (!m)
            throwError(
                expr,
                `format descriptor ("u32", "i22.10", etc) expected`
            )
        let sz = parseInt(m[2])
        let shift = 0
        if (m[3]) {
            shift = parseInt(m[3].slice(1))
            sz += shift
        }

        let r: NumFmt

        switch (sz) {
            case 8:
                r = NumFmt.U8
                break
            case 16:
                r = NumFmt.U16
                break
            case 32:
                r = NumFmt.U32
                break
            case 64:
                r = NumFmt.U64
                break
            default:
                throwError(
                    expr,
                    `total format size is not one of 8, 16, 32, 64 bits`
                )
        }

        switch (m[1]) {
            case "u":
                break
            case "i":
                r += NumFmt.I8
                break
            case "f":
                if (shift) throwError(expr, `shifts not supported for floats`)
                r += NumFmt.F8
                break
            default:
                assert(false)
        }

        if (r == NumFmt.F8 || r == NumFmt.F16)
            throwError(expr, `f8 and f16 are not supported`)

        return r | (shift << 4)
    }

    private emitBufferCall(
        expr: ts.CallExpression,
        buf: Value,
        prop: string
    ): Value {
        const wr = this.writer
        if (!ts.isPropertyAccessExpression(expr.expression)) oops("")
        switch (prop) {
            case "getAt": {
                this.requireArgs(expr, 2)
                const fmt = this.parseFormat(expr.arguments[1])
                return wr.emitExpr(
                    Op.EXPR3_LOAD_BUFFER,
                    buf,
                    literal(fmt),
                    this.emitSimpleValue(expr.arguments[0])
                )
            }

            case "setAt": {
                this.requireArgs(expr, 3)
                const fmt = this.parseFormat(expr.arguments[1])
                const off = this.emitSimpleValue(expr.arguments[0])
                const val = this.emitSimpleValue(expr.arguments[2])
                wr.emitStmt(Op.STMT4_STORE_BUFFER, buf, literal(fmt), off, val)
                return unit()
            }

            case "setLength": {
                if (buf.op != Op.EXPR0_PKT_BUFFER)
                    throwError(
                        expr,
                        ".setLength() only supported on 'packet' buffer"
                    )
                this.requireArgs(expr, 1)
                const len = this.emitSimpleValue(expr.arguments[0])
                wr.emitStmt(Op.STMT1_SETUP_PKT_BUFFER, len)
                return unit()
            }

            case "blitAt": {
                this.requireArgs(expr, 4)
                const dstOffset = this.emitSimpleValue(expr.arguments[0])
                const srcref = this.emitSimpleValue(
                    expr.arguments[1],
                    ValueType.BUFFER
                )
                const srcOffset = this.emitSimpleValue(expr.arguments[2])
                const len = this.emitSimpleValue(expr.arguments[3])
                wr.emitStmt(
                    Op.STMT5_BLIT,
                    buf,
                    dstOffset,
                    srcref,
                    srcOffset,
                    len
                )
                return unit()
            }

            case "fillAt": {
                this.requireArgs(expr, 3)
                const offset = this.emitSimpleValue(expr.arguments[0])
                const len = this.emitSimpleValue(expr.arguments[1])
                const val = this.emitSimpleValue(expr.arguments[2])
                wr.emitStmt(Op.STMT4_MEMSET, buf, offset, len, val)
                return unit()
            }

            default:
                throwError(expr, `cannot find ${prop} on buffer`)
        }
    }

    private stringLiteral(expr: Expr) {
        if (this.isStringLiteral(expr)) return expr.text
        return undefined
    }

    private bufferLiteral(expr: Expr): Uint8Array {
        if (!expr) return undefined

        if (ts.isTaggedTemplateExpression(expr) && idName(expr.tag) == "hex") {
            if (!ts.isNoSubstitutionTemplateLiteral(expr.template))
                throwError(
                    expr,
                    "${}-expressions not supported in hex literals"
                )
            const hexbuf = expr.template.text.replace(/\s+/g, "").toLowerCase()
            if (hexbuf.length & 1) throwError(expr, "non-even hex length")
            if (!/^[0-9a-f]*$/.test(hexbuf))
                throwError(expr, "invalid characters in hex")
            return fromHex(hexbuf)
        }

        const b = this.bufferLits.lookup(idName(expr)) as BufferLit
        if (b) return b.litValue

        return undefined
    }

    private forceStringLiteral(expr: Expr) {
        const v = this.stringLiteral(expr)
        if (v === undefined) throwError(expr, "string literal expected")
        return this.writer.emitString(v)
    }

    private fieldTypeToValueType(mem: jdspec.PacketMember) {
        switch (mem.type) {
            case "bytes":
            case "string":
            case "string0":
                return ValueType.BUFFER
            case "bool":
                return ValueType.BOOL
            default:
                return ValueType.NUMBER
        }
    }

    private bufferSize(v: Value) {
        if (v.op == Op.EXPRx_STATIC_BUFFER) {
            const idx = v.args[0]?.numValue
            if (idx != null) {
                const lit = this.stringLiterals[idx]
                if (typeof lit == "string") return strlen(lit)
                else return lit.length
            }
        }
        return undefined
    }

    private emitStringOrBuffer(expr: Expr) {
        const stringLiteral = this.stringLiteral(expr)
        const wr = this.writer
        if (stringLiteral != undefined) {
            return wr.emitString(stringLiteral)
        } else {
            const buf = this.bufferLiteral(expr)
            if (buf) {
                return wr.emitString(buf)
            } else {
                throwError(expr, "expecting a string literal here")
            }
        }
    }

    private emitPackArgs(expr: ts.CallExpression, pspec: jdspec.PacketInfo) {
        let offset = 0
        let repeatsStart = -1
        let specIdx = 0
        const fields = pspec.fields

        if (expr.arguments.length == 1 && idName(expr.arguments[0]) == "packet")
            return

        const wr = this.writer
        const args = expr.arguments.map(arg => {
            if (specIdx >= fields.length) {
                if (repeatsStart != -1) specIdx = repeatsStart
                else throwError(arg, `too many arguments`)
            }
            const spec = pspec.fields[specIdx++]
            if (spec.startRepeats) repeatsStart = specIdx - 1
            let size = Math.abs(spec.storage)
            let stringLiteralVal: Value = undefined
            if (size == 0) {
                stringLiteralVal = this.emitStringOrBuffer(arg)
                size = this.bufferSize(stringLiteralVal)
                if (spec.type == "string0") size += 1
            }
            const val = stringLiteralVal
                ? null
                : this.emitSimpleValue(arg, this.fieldTypeToValueType(spec))
            const r = {
                stringLiteralVal,
                size,
                offset,
                spec,
                val,
            }
            offset += size
            return r
        })

        // this could be skipped - they will just be zero
        if (specIdx < fields.length) throwError(expr, "not enough arguments")

        if (offset > JD_SERIAL_MAX_PAYLOAD_SIZE)
            throwError(expr, "arguments do not fit in a packet")

        wr.allocBuf()
        wr.emitStmt(Op.STMT1_SETUP_PKT_BUFFER, literal(offset))
        for (const desc of args) {
            if (desc.stringLiteralVal !== undefined) {
                const vd = desc.stringLiteralVal
                wr.emitStmt(Op.STMT2_SET_PKT, vd, literal(desc.offset))
            } else {
                wr.emitBufStore(desc.val, bufferFmt(desc.spec), desc.offset)
            }
        }
        wr.freeBuf()
    }

    private emitRegisterCall(
        expr: ts.CallExpression,
        val: Value,
        prop: string
    ): Value {
        assert(val.valueType.kind == ValueKind.JD_REG)
        const spec = val.valueType.packetSpec
        const vobj = va(val)
        assertRange(0, spec.identifier, 0x1ff)

        switch (prop) {
            case "read":
                this.requireArgs(expr, 0)
                return this.emitRegGet(val)
            case "write":
                this.emitPackArgs(expr, spec)
                this.emitSendCommand(
                    vobj.roleExpr,
                    spec.identifier | CMD_SET_REG
                )
                return unit()
            case "onChange": {
                const role = this.roleOf(expr.expression, val)
                this.requireArgs(expr, 2)
                this.requireTopLevel(expr)
                if (spec.fields.length != 1)
                    throwError(expr, "wrong register type")
                const threshold = this.forceNumberLiteral(expr.arguments[0])
                const name = role + "_chg_" + spec.name
                const handler = this.emitHandler(name, expr.arguments[1])
                if (role.autoRefreshRegs.indexOf(spec) < 0)
                    role.autoRefreshRegs.push(spec)
                this.emitInRoleDispatcher(role, wr => {
                    const cache = this.proc.mkTempLocal(name, ValueType.NUMBER)
                    role.dispatcher.init.emit(wr => {
                        this.emitStore(cache, literal(NaN))
                    })
                    const cond = wr.emitExpr(
                        Op.EXPR2_EQ,
                        wr.emitExpr(Op.EXPR0_PKT_REG_GET_CODE),
                        literal(spec.identifier)
                    )
                    wr.emitIfAndPop(cond, () => {
                        // get the reg value from current packet
                        const curr = wr.cacheValue(
                            this.extractRegField(spec, spec.fields[0])
                        )
                        const skipHandler = wr.mkLabel("skipHandler")
                        // if (curr == undefined) goto skip (shouldn't really happen unless service is misbehaving)
                        wr.emitJumpIfTrue(
                            skipHandler,
                            wr.emitExpr(Op.EXPR1_IS_NULL, curr.emit())
                        )
                        // if (Math.abs(tmp-curr) < threshold) goto skip
                        // note that this also calls handler() if cache was NaN
                        const absval = wr.emitExpr(
                            Op.EXPR1_ABS,
                            wr.emitExpr(
                                Op.EXPR2_SUB,
                                cache.emit(wr),
                                curr.emit()
                            )
                        )
                        wr.emitJumpIfTrue(
                            skipHandler,
                            wr.emitExpr(Op.EXPR2_LT, absval, literal(threshold))
                        )
                        // cache := curr
                        this.emitStore(cache, curr.emit())
                        curr.free()
                        // handler()
                        handler.callMe(wr, [], OpCall.BG_MAX1_PEND1)
                        // skip:
                        wr.emitLabel(skipHandler)
                    })
                })
                return unit()
            }
        }
        throwError(expr, `registers don't have property ${prop}`)
    }

    private emitArgs(args: Expr[], formals?: Variable[]) {
        const wr = this.writer
        const arglist = wr.allocTmpLocals(args.length)

        for (let i = 0; i < args.length; i++) {
            let tp = ValueType.NUMBER
            const f = formals?.[i]
            if (f) tp = f.valueType
            arglist[i].valueType = tp
            arglist[i].store(this.emitSimpleValue(args[i], tp))
        }

        return arglist
    }

    private forceNumberLiteral(expr: Expr) {
        const tmp = this.emitExpr(expr)
        if (!tmp.isLiteral) throwError(expr, "number literal expected")
        return tmp.numValue
    }

    private finalizeCloudMethods() {
        if (!this.cloudMethodDispatcher) return
        this.emitInRoleDispatcher(this.cloudRole, wr => {
            const skipMethods = wr.mkLabel("skipMethods")
            const cond = wr.emitExpr(
                Op.EXPR2_EQ,
                wr.emitExpr(Op.EXPR0_PKT_EV_CODE),
                literal(CloudAdapterEvent.CloudCommand)
            )
            wr.emitJump(skipMethods, cond)

            this.cloudMethodDispatcher.finalizeRaw()
            this.emitAckCloud(CloudAdapterCommandStatus.NotFound, true)
            wr.emitJump(this.cloudRole.dispatcher.top)

            wr.emitLabel(this.cloudMethod429)
            this.emitAckCloud(CloudAdapterCommandStatus.Busy, true)
            wr.emitJump(this.cloudRole.dispatcher.top)

            wr.emitLabel(skipMethods)
        })
    }

    private emitCloudMethod(expr: ts.CallExpression) {
        this.requireTopLevel(expr)
        this.requireArgs(expr, 2)
        const str = this.forceStringLiteral(expr.arguments[0])
        const handler = this.emitHandler(
            this.codeName(expr.expression),
            expr.arguments[1],
            { methodHandler: true }
        )
        if (!this.cloudMethodDispatcher) {
            this.emitInRoleDispatcher(this.cloudRole, wr => {
                this.cloudMethod429 = wr.mkLabel("cloud429")
            })
            this.cloudMethodDispatcher = new DelayedCodeSection(
                "cloud_method",
                this.cloudRole.dispatcher.proc.writer
            )
        }

        this.cloudMethodDispatcher.emit(wr => {
            const skip = wr.mkLabel("skipMethod")
            wr.emitJump(skip, wr.emitExpr(Op.EXPR2_STR0EQ, str, literal(4)))
            wr.emitJumpIfTrue(
                this.cloudMethod429,
                wr.emitExpr(Op.EXPR1_GET_FIBER_HANDLE, handler.reference(wr))
            )
            const args = wr.allocTmpLocals(handler.numargs)
            args[0].store(wr.emitBufLoad(NumFmt.U32, 0))
            const pref = 4 + strlen(this.stringLiteral(expr.arguments[0])) + 1
            for (let i = 1; i < handler.numargs; ++i)
                args[i].store(wr.emitBufLoad(NumFmt.F64, pref + (i - 1) * 8))
            handler.callMe(wr, args, OpCall.BG_MAX1)
            wr.emitJump(this.cloudRole.dispatcher.top)
            wr.emitLabel(skip)
        })
    }

    private emitSendCommand(role: Value | Role, cmd: number) {
        if (role instanceof Role) role = role.emit(this.writer)
        this.writer.emitStmt(Op.STMT2_SEND_CMD, role, literal(cmd))
    }

    private emitCloud(expr: ts.CallExpression, fnName: string): Value {
        const arg0 = expr.arguments[0]
        const wr = this.writer
        switch (fnName) {
            case "cloud.upload":
                const spec = this.cloudRole.spec.packets.find(
                    p => p.name == "upload"
                )
                this.emitPackArgs(expr, spec)
                this.emitSendCommand(this.cloudRole, spec.identifier)
                return unit()
            case "cloud.onMethod":
                this.emitCloudMethod(expr)
                return unit()
            case "console.log":
                if (
                    expr.arguments.length == 1 &&
                    ts.isCallExpression(arg0) &&
                    idName(arg0.expression) == "format"
                ) {
                    const r = this.emitFmtArgs(arg0)
                    wr.emitStmt(Op.STMTx2_LOG_FORMAT, ...r.fmt)
                    r.free()
                } else {
                    let fmt = ""
                    const fmtargs = []
                    for (const arg of expr.arguments) {
                        if (fmt && !/[=:]$/.test(fmt)) fmt += " "
                        const str = this.stringLiteral(arg)
                        if (str) {
                            fmt += str
                        } else {
                            fmt += `{${fmtargs.length}}`
                            fmtargs.push(arg)
                        }
                    }
                    const r = this.fmtArgs(fmtargs)
                    wr.emitStmt(
                        Op.STMTx2_LOG_FORMAT,
                        ...r.fmt,
                        wr.emitString(fmt)
                    )
                    r.free()
                }
                return unit()
            case "Date.now":
                return wr.emitExpr(Op.EXPR0_NOW_MS)
            default:
                return null
        }
    }

    private emitMath(node: ts.Node, args: Expr[], fnName: string): Value {
        interface Desc {
            m1?: Op
            m2?: Op
            lastArg?: number
            firstArg?: number
            div?: number
        }

        const funs: SMap<Desc> = {
            "Math.floor": { m1: Op.EXPR1_FLOOR },
            "Math.round": { m1: Op.EXPR1_ROUND },
            "Math.ceil": { m1: Op.EXPR1_CEIL },
            "Math.log": { m1: Op.EXPR1_LOG_E },
            "Math.random": { m1: Op.EXPR1_RANDOM, lastArg: 1.0 },
            "Math.randomInt": { m1: Op.EXPR1_RANDOM_INT },
            "Math.max": { m2: Op.EXPR2_MAX },
            "Math.min": { m2: Op.EXPR2_MIN },
            "Math.pow": { m2: Op.EXPR2_POW },
            "Math.idiv": { m2: Op.EXPR2_IDIV },
            "Math.imul": { m2: Op.EXPR2_IMUL },
            "Math.sqrt": { m2: Op.EXPR2_POW, lastArg: 1 / 2 },
            "Math.cbrt": { m2: Op.EXPR2_POW, lastArg: 1 / 3 },
            "Math.exp": { m2: Op.EXPR2_POW, firstArg: Math.E },
            "Math.log10": { m1: Op.EXPR1_LOG_E, div: Math.log(10) },
            "Math.log2": { m1: Op.EXPR1_LOG_E, div: Math.log(2) },
            "Math.abs": { m1: Op.EXPR1_ABS },
        }

        const wr = this.writer
        const f = funs[fnName]
        if (!f) return null

        let numArgs = f.m1 !== undefined ? 1 : f.m2 !== undefined ? 2 : NaN
        const origArgs = numArgs
        if (f.firstArg !== undefined) numArgs--
        if (f.lastArg !== undefined) numArgs--
        assert(!isNaN(numArgs))
        this.requireArgsExt(node, args, numArgs)

        if (f.firstArg !== undefined) args.unshift(this.mkLiteral(f.firstArg))
        if (f.lastArg !== undefined) args.push(this.mkLiteral(f.lastArg))
        assert(args.length == origArgs)

        const allArgs = args.map(a => this.emitExpr(a))
        let res = wr.emitExpr(f.m1 || f.m2, ...allArgs)

        if (f.div !== undefined)
            res = wr.emitExpr(Op.EXPR2_MUL, res, literal(1 / f.div))

        return res
    }

    private emitProcCall(
        expr: ts.CallExpression,
        proc: Procedure,
        isMember = false
    ) {
        const wr = this.writer
        const args = expr.arguments.slice()
        if (isMember) {
            this.requireArgs(expr, proc.numargs - 1)
            if (ts.isPropertyAccessExpression(expr.expression))
                args.unshift(expr.expression.expression)
            else assert(false)
        } else {
            this.requireArgs(expr, proc.numargs)
        }
        const cargs = this.emitArgs(args, proc.args())
        proc.callMe(wr, cargs)
        return wr.emitExpr(Op.EXPR0_RET_VAL)
    }

    private emitCallExpression(expr: ts.CallExpression): Value {
        const wr = this.writer
        if (ts.isPropertyAccessExpression(expr.expression)) {
            const prop = idName(expr.expression.name)
            const objName = idName(expr.expression.expression)
            if (objName) {
                const fullName = objName + "." + prop
                const r =
                    this.emitMath(expr, expr.arguments.slice(), fullName) ||
                    this.emitCloud(expr, fullName)
                if (r) return r
            }
            const val = this.emitExpr(expr.expression.expression)
            switch (val.valueType.kind) {
                case ValueKind.JD_EVENT:
                    return this.emitEventCall(expr, val, prop)
                case ValueKind.JD_REG:
                    return this.emitRegisterCall(expr, val, prop)
                case ValueKind.BUFFER:
                    return this.emitBufferCall(expr, val, prop)
                case ValueKind.ROLE:
                    return this.emitRoleCall(expr, val, prop)
                default:
                    throwError(expr, `unsupported call`)
            }
        }

        const funName = idName(expr.expression)

        if (!funName) throwError(expr, `unsupported call`)

        if (!reservedFunctions[funName]) {
            const d = this.functions.lookup(funName) as FunctionDecl
            if (d) {
                return this.emitProcCall(expr, this.getFunctionProc(d))
            } else {
                throwError(expr, `cannot find function '${funName}'`)
            }
        }

        switch (funName) {
            case "buffer": {
                this.requireArgs(expr, 1)
                wr.emitStmt(
                    Op.STMT1_ALLOC_BUFFER,
                    this.emitExpr(expr.arguments[0])
                )
                const r = wr.emitExpr(Op.EXPR0_RET_VAL)
                r.valueType = ValueType.BUFFER
                return r
            }
            case "wait": {
                this.requireArgs(expr, 1)
                wr.emitStmt(Op.STMT1_SLEEP_S, this.emitExpr(expr.arguments[0]))
                return unit()
            }
            case "isNaN": {
                this.requireArgs(expr, 1)
                return wr.emitExpr(
                    Op.EXPR1_IS_NAN,
                    this.emitSimpleValue(expr.arguments[0])
                )
            }
            case "reboot": {
                this.requireArgs(expr, 0)
                wr.emitStmt(Op.STMT1_PANIC, literal(0))
                return unit()
            }
            case "panic": {
                this.requireArgs(expr, 1)
                const code = this.forceNumberLiteral(expr.arguments[0])
                if ((code | 0) != code || code <= 0 || code > 9999)
                    throwError(
                        expr,
                        "panic() code must be integer between 1 and 9999"
                    )
                wr.emitStmt(Op.STMT1_PANIC, literal(code))
                return unit()
            }
            case "every": {
                this.requireTopLevel(expr)
                this.requireArgs(expr, 2)
                const time = Math.round(
                    this.forceNumberLiteral(expr.arguments[0]) * 1000
                )
                if (time < 20)
                    throwError(expr, "minimum every() period is 0.02s (20ms)")
                const proc = this.emitHandler("every", expr.arguments[1], {
                    every: time,
                })
                proc.callMe(wr, [], OpCall.BG)
                return unit()
            }
            case "onStart": {
                this.requireTopLevel(expr)
                this.requireArgs(expr, 1)
                const proc = this.emitHandler("onStart", expr.arguments[0])
                this.onStart.emit(wr => proc.callMe(wr, []))
                return unit()
            }
            case "format":
                const r = wr.allocBuf()
                const t = this.emitFmtArgs(expr)
                wr.emitStmt(Op.STMTx3_FORMAT, ...t.fmt, literal(0))
                t.free()
                wr.freeBuf()
                return r
        }
        throwError(expr, "unhandled call")
    }

    private fmtArgs(exprs: Expr[]) {
        const args = this.emitArgs(exprs)
        const free = () => {
            for (const a of args) a.free()
        }
        const fmt = [literal(args[0] ? args[0].index : 0), literal(args.length)]
        return { fmt, free }
    }

    private emitFmtArgs(expr: ts.CallExpression) {
        const fmtString = this.forceStringLiteral(expr.arguments[0])
        const { fmt, free } = this.fmtArgs(expr.arguments.slice(1))
        fmt.push(fmtString)
        return { fmt, free }
    }

    private emitIdentifier(expr: ts.Identifier): Value {
        const id = this.forceName(expr)
        switch (id) {
            case "NaN":
                return literal(NaN)
            case "undefined":
            case "null":
                return literal(null)
            case "packet":
                return this.writer.emitExpr(Op.EXPR0_PKT_BUFFER)
            default:
                const cell = this.proc.locals.lookup(id)
                if (!cell) throwError(expr, "unknown name: " + id)
                return cell.emit(this.writer)
        }
    }

    private emitThisExpression(expr: ts.ThisExpression): Value {
        const cell = this.proc.params.lookup("this")
        if (!cell)
            throwError(expr, "'this' cannot be used here: " + this.proc.name)
        return cell.emit(this.writer)
    }

    private matchesSpecName(pi: jdspec.PacketInfo, id: string) {
        return matchesName(pi.name, id)
    }

    private emitRoleMember(expr: ts.PropertyAccessExpression, roleObj: Value) {
        const propName = this.forceName(expr.name)
        let r: Value
        let v: ValueAdd

        assert(roleObj.valueType.isRole)

        const roleSpec = roleObj.valueType.roleSpec

        const setKind = (p: jdspec.PacketInfo, kind: ValueKind) => {
            assert(!r)
            r = nonEmittable(new ValueType(kind, roleSpec, p))
            v = va(r)
            v.index = p.identifier
            v.roleExpr = roleObj
        }

        for (const cmd of this.clientCommands[roleSpec.camelName] ?? []) {
            if (this.matchesSpecName(cmd.pktSpec, propName)) {
                setKind(cmd.pktSpec, ValueKind.JD_CLIENT_COMMAND)
                v.clientCommand = cmd
                return r
            }
        }

        let generic: jdspec.PacketInfo
        for (const p of this.sysSpec.packets) {
            if (this.matchesSpecName(p, propName)) generic = p
        }

        for (const p of roleSpec.packets) {
            if (
                this.matchesSpecName(p, propName) ||
                (generic?.identifier == p.identifier && generic?.kind == p.kind)
            ) {
                if (isRegister(p)) {
                    setKind(p, ValueKind.JD_REG)
                }
                if (isEvent(p)) {
                    setKind(p, ValueKind.JD_EVENT)
                }
                if (isCommand(p)) {
                    setKind(p, ValueKind.JD_COMMAND)
                }
            }
        }

        const packetSpec = r?.valueType?.packetSpec

        if (packetSpec?.client)
            throwError(
                expr,
                `client packet '${packetSpec.name}' not implemented on ${roleSpec.camelName}`
            )

        if (!r)
            throwError(
                expr,
                `service ${roleSpec.camelName} has no member ${propName}`
            )
        return r

        function isRegister(pi: jdspec.PacketInfo) {
            return pi.kind == "ro" || pi.kind == "rw" || pi.kind == "const"
        }

        function isEvent(pi: jdspec.PacketInfo) {
            return pi.kind == "event"
        }

        function isCommand(pi: jdspec.PacketInfo) {
            return pi.kind == "command"
        }
    }

    private emitRoleLike(expr: Expr) {
        const obj = this.emitExpr(expr)
        this.ignore(obj)
        return obj
    }

    private emitElementAccessExpression(
        expr: ts.ElementAccessExpression
    ): Value {
        const val = this.emitExpr(expr.expression)
        if (val.valueType.canIndex) {
            const idx = this.emitSimpleValue(expr.argumentExpression)
            return this.writer.emitExpr(Op.EXPR2_INDEX, val, idx)
        } else {
            throwError(expr, `unhandled indexing on ${val.valueType}`)
        }
    }

    private emitPropertyAccessExpression(
        expr: ts.PropertyAccessExpression
    ): Value {
        const nsName = idName(expr.expression)
        if (nsName == "Math") {
            const id = idName(expr.name)
            if (mathConst.hasOwnProperty(id)) return literal(mathConst[id])
        } else if (this.enums.hasOwnProperty(nsName)) {
            const e = this.enums[nsName]
            const prop = idName(expr.name)
            if (e.members.hasOwnProperty(prop)) return literal(e.members[prop])
            else throwError(expr, `enum ${nsName} has no member ${prop}`)
        }

        const val = this.emitExpr(expr.expression)

        if (val.valueType.isRole) {
            return this.emitRoleMember(expr, val)
        } else if (val.valueType.canIndex) {
            const propName = this.forceName(expr.name)
            if (propName == "length")
                return this.writer.emitExpr(Op.EXPR1_OBJECT_LENGTH, val)
        } else if (val.valueType.kind == ValueKind.JD_REG) {
            const spec = val.valueType.packetSpec
            const propName = this.forceName(expr.name)
            if (spec.fields.length > 1) {
                const fld = spec.fields.find(f => matchesName(f.name, propName))
                if (!fld)
                    throwError(expr, `no field ${propName} in ${spec.name}`)
                return this.emitRegGet(val, undefined, fld)
            } else {
                throwError(expr, `unhandled member ${propName}; use .read()`)
            }
        }

        throwError(expr, `unhandled member ${idName(expr.name)}`)
    }

    private mkLiteral(v: number): ts.NumericLiteral {
        return ts.factory.createNumericLiteral(v)
    }

    private isStringLiteral(node: ts.Node): node is ts.LiteralExpression {
        switch (node.kind) {
            case SK.TemplateHead:
            case SK.TemplateMiddle:
            case SK.TemplateTail:
            case SK.StringLiteral:
            case SK.NoSubstitutionTemplateLiteral:
                return true
            default:
                return false
        }
    }

    private emitLiteral(v: any, node?: ts.Node) {
        if (v === true) v = 1
        else if (v === false) v = 0

        if (v === null || v === undefined) return literal(v)

        if (typeof v == "string") return this.writer.emitString(v)

        if (typeof v == "number") return literal(v)

        throwError(node, "unhandled literal: " + v)
    }

    private emitLiteralExpression(node: ts.LiteralExpression): Value {
        const wr = this.writer

        if (node.kind == SK.NumericLiteral) {
            const parsed = parseFloat(node.text)
            return this.emitLiteral(parsed)
        } else if (this.isStringLiteral(node)) {
            return wr.emitString(node.text)
        } else {
            throwError(node, "whoops")
        }
    }

    private lookupCell(expr: ts.Expression) {
        const name = this.forceName(expr)
        const r = this.proc.locals.lookup(name)
        if (!r) throwError(expr, `cannot find '${name}'`)
        return r
    }

    private lookupVar(expr: ts.Expression) {
        const r = this.lookupCell(expr)
        if (!(r instanceof Variable)) throwError(expr, "expecting variable")
        return r
    }

    private emitSimpleValue(expr: Expr, tp = ValueType.NUMBER): Value {
        const val = this.emitExpr(expr)
        this.requireValueType(expr, val, tp)
        return val
    }

    private isBoolLike(tp: ValueType) {
        switch (tp.kind) {
            case ValueKind.ANY:
            case ValueKind.NUMBER:
            case ValueKind.NULL:
            case ValueKind.BOOL:
            case ValueKind.BUFFER:
            case ValueKind.MAP:
            case ValueKind.ARRAY:
            case ValueKind.FIBER:
            case ValueKind.ROLE:
                return true
            default:
                return false
        }
    }

    private isSimpleValue(tp: ValueType) {
        return this.isBoolLike(tp)
    }

    private requireValueType(node: ts.Node, v: Value, reqTp: ValueType) {
        if (reqTp == ValueType.BOOL && this.isBoolLike(v.valueType)) return
        if (reqTp == ValueType.ANY && this.isSimpleValue(v.valueType)) return
        if (v.valueType == ValueType.ANY || v.valueType == ValueType.NULL)
            return
        if (!v.valueType.equals(reqTp))
            throwError(node, `cannot convert ${v.valueType} to ${reqTp}`)
    }

    private emitPrototypeUpdate(expr: ts.BinaryExpression): Value {
        const left = expr.left
        if (
            !ts.isPropertyAccessExpression(left) ||
            !ts.isPropertyAccessExpression(left.expression) ||
            idName(left.expression.name) != "prototype"
        )
            return null

        const clName = this.forceName(left.expression.expression)
        const spec = this.specFromTypeName(left.expression.expression, clName)
        const fnName = this.forceName(left.name)
        if (!ts.isFunctionExpression(expr.right))
            throwError(expr.right, "expecting 'function (...) { }' here")

        const cmd = new ClientCommand(spec)
        cmd.defintion = expr.right
        cmd.jsName = fnName

        const fn = expr.right
        cmd.pktSpec = spec.packets.filter(
            p => p.kind == "command" && matchesName(p.name, fnName)
        )[0]
        const paramNames = fn.parameters.map(p => this.forceName(p.name))
        if (cmd.pktSpec) {
            if (!cmd.pktSpec.client)
                throwError(left, "only 'client' commands can be implemented")
            const flds = cmd.pktSpec.fields
            if (paramNames.length != flds.length)
                throwError(
                    fn,
                    `expecting ${flds.length} parameter(s); got ${paramNames.length}`
                )
            for (let i = 0; i < flds.length; ++i) {
                const f = flds[i]
                if (f.storage == 0)
                    throwError(
                        fn,
                        `client command has non-numeric parameter ${f.name}`
                    )
                if (
                    paramNames.findIndex(
                        p => p == f.name || matchesName(f.name, p)
                    ) != i
                )
                    throwError(fn, `parameter ${f.name} found at wrong index`)
            }
        } else {
            cmd.pktSpec = {
                kind: "command",
                description: "",
                client: true,
                identifier: 0x10000 + Object.keys(this.clientCommands).length,
                name: snakify(fnName),
                fields: fn.parameters.map(p => ({
                    name: this.forceName(p.name),
                    type: "f64",
                    storage: 8,
                })),
            }
            cmd.isFresh = true
            if (spec.packets.some(p => p.name == cmd.pktSpec.name))
                throwError(
                    expr.left,
                    `'${cmd.pktSpec.name}' already exists on ${spec.camelName}`
                )
        }

        let lst = this.clientCommands[spec.camelName]
        if (!lst) lst = this.clientCommands[spec.camelName] = []
        if (lst.some(e => e.pktSpec.name == cmd.pktSpec.name))
            throwError(
                expr.left,
                `${cmd.pktSpec.name} already implemented on ${spec.camelName}`
            )
        lst.push(cmd)

        if (this.compileAll || (this.isLibrary && this.inMainFile(expr)))
            this.getClientCommandProc(cmd)

        return unit()
    }

    private emitAssignmentExpression(expr: ts.BinaryExpression): Value {
        const res = this.emitPrototypeUpdate(expr)
        if (res) return res

        const wr = this.writer
        let left = expr.left

        if (ts.isElementAccessExpression(left)) {
            const arr = this.emitExpr(left.expression)
            if (arr.valueType.canIndex) {
                const idx = this.emitSimpleValue(left.argumentExpression)
                const src = this.emitExpr(expr.right) // compute src after left.property
                wr.emitStmt(Op.STMT3_ARRAY_SET, arr, idx, src)
                return unit()
            } else {
                throwError(expr, `unhandled indexing on ${arr.valueType}`)
            }
        }

        const src = this.emitExpr(expr.right)
        if (ts.isArrayLiteralExpression(left)) {
            if (src.valueType.kind == ValueKind.JD_VALUE_SEQ) {
                let off = 0
                const spec = src.valueType.packetSpec
                for (let i = 0; i < left.elements.length; ++i) {
                    const pat = left.elements[i]
                    const f = spec.fields[i]
                    if (!f) throwError(pat, `not enough fields in ${spec.name}`)
                    const e = wr.emitBufLoad(bufferFmt(f), off)
                    off += Math.abs(f.storage)
                    this.emitStore(this.lookupVar(pat), e)
                }
            } else {
                throwError(expr, "expecting a multi-field register read")
            }
            return unit()
        } else if (ts.isIdentifier(left)) {
            const v = this.lookupVar(left)
            this.requireValueType(expr.right, src, v.valueType)
            this.emitStore(v, src)
            return unit()
        }

        throwError(expr, "unhandled assignment")
    }

    private emitBinaryExpression(expr: ts.BinaryExpression): Value {
        const simpleOps: SMap<Op> = {
            [SK.PlusToken]: Op.EXPR2_ADD,
            [SK.MinusToken]: Op.EXPR2_SUB,
            [SK.SlashToken]: Op.EXPR2_DIV,
            [SK.AsteriskToken]: Op.EXPR2_MUL,
            [SK.PercentToken]: Op.EXPR2_IMOD,
            [SK.LessThanToken]: Op.EXPR2_LT,
            [SK.BarToken]: Op.EXPR2_BIT_OR,
            [SK.AmpersandToken]: Op.EXPR2_BIT_AND,
            [SK.CaretToken]: Op.EXPR2_BIT_XOR,
            [SK.LessThanLessThanToken]: Op.EXPR2_SHIFT_LEFT,
            [SK.GreaterThanGreaterThanToken]: Op.EXPR2_SHIFT_RIGHT,
            [SK.GreaterThanGreaterThanGreaterThanToken]:
                Op.EXPR2_SHIFT_RIGHT_UNSIGNED,
            [SK.LessThanEqualsToken]: Op.EXPR2_LE,
            [SK.EqualsEqualsToken]: Op.EXPR2_EQ,
            [SK.EqualsEqualsEqualsToken]: Op.EXPR2_EQ,
            [SK.ExclamationEqualsToken]: Op.EXPR2_NE,
            [SK.ExclamationEqualsEqualsToken]: Op.EXPR2_NE,
        }

        let op = expr.operatorToken.kind

        if (op == SK.EqualsToken) return this.emitAssignmentExpression(expr)

        if (op == SK.AsteriskAsteriskToken)
            return this.emitMath(expr, [expr.left, expr.right], "Math.pow")

        let swap = false
        if (op == SK.GreaterThanToken) {
            op = SK.LessThanToken
            swap = true
        }
        if (op == SK.GreaterThanEqualsToken) {
            op = SK.LessThanEqualsToken
            swap = true
        }

        const wr = this.writer

        if (op == SK.AmpersandAmpersandToken || op == SK.BarBarToken) {
            const a = this.emitSimpleValue(expr.left, ValueType.BOOL)
            const tmp = wr.cacheValue(a)
            const tst = wr.emitExpr(
                op == SK.AmpersandAmpersandToken
                    ? Op.EXPR1_TO_BOOL
                    : Op.EXPR1_NOT,
                tmp.emit()
            )
            const skipB = wr.mkLabel("lazyB")
            wr.emitJump(skipB, tst)
            tmp.store(this.emitSimpleValue(expr.right, ValueType.BOOL))
            wr.emitLabel(skipB)
            const res = tmp.emit()
            tmp.free()
            return res
        }

        const op2 = simpleOps[op]
        if (op2 === undefined) throwError(expr, "unhandled operator")
        let a = this.emitSimpleValue(expr.left)
        let b = this.emitSimpleValue(expr.right)
        if (swap) [a, b] = [b, a]
        return wr.emitExpr(op2, a, b)
    }

    private emitUnaryExpression(expr: ts.PrefixUnaryExpression): Value {
        const simpleOps: SMap<Op> = {
            [SK.ExclamationToken]: Op.EXPR1_NOT,
            [SK.MinusToken]: Op.EXPR1_NEG,
            [SK.TildeToken]: Op.EXPR1_BIT_NOT,
            [SK.PlusToken]: Op.EXPR1_ID,
        }

        let op = simpleOps[expr.operator]
        if (op === undefined) throwError(expr, "unhandled operator")

        let arg = expr.operand

        if (
            expr.operator == SK.ExclamationToken &&
            ts.isPrefixUnaryExpression(arg) &&
            arg.operator == SK.ExclamationToken
        ) {
            op = Op.EXPR1_TO_BOOL
            arg = arg.operand
        }

        const wr = this.writer
        const a = this.emitSimpleValue(
            arg,
            op == Op.EXPR1_NOT ? ValueType.BOOL : ValueType.NUMBER
        )
        return wr.emitExpr(op, a)
    }

    private emitArrayExpression(expr: ts.ArrayLiteralExpression): Value {
        const wr = this.writer
        const sz = expr.elements.length
        wr.emitStmt(Op.STMT1_ALLOC_ARRAY, literal(sz))
        const arr = wr.emitExpr(Op.EXPR0_RET_VAL)
        if (sz == 0) {
            arr.valueType = ValueType.ARRAY
            return arr
        }
        const ref = wr.cacheValue(arr)
        for (let i = 0; i < sz; ++i) {
            wr.emitStmt(
                Op.STMT3_ARRAY_SET,
                ref.emit(),
                literal(i),
                this.emitSimpleValue(expr.elements[i], ValueType.ANY)
            )
        }
        return ref.finalEmit(ValueType.ARRAY)
    }

    private emitObjectExpression(expr: ts.ObjectLiteralExpression): Value {
        const wr = this.writer
        wr.emitStmt(Op.STMT0_ALLOC_MAP)
        if (expr.properties.length)
            throwError(expr, "object initializers not supported yet")
        const arr = wr.emitExpr(Op.EXPR0_RET_VAL)
        arr.valueType = ValueType.MAP
        return arr
    }

    private emitExpr(expr: Expr): Value {
        switch (expr.kind) {
            case SK.CallExpression:
                return this.emitCallExpression(expr as ts.CallExpression)
            case SK.FalseKeyword:
                return this.emitLiteral(false)
            case SK.TrueKeyword:
                return this.emitLiteral(true)
            case SK.NullKeyword:
                return this.emitLiteral(null)
            case SK.UndefinedKeyword:
                return this.emitLiteral(undefined)
            case SK.Identifier:
                return this.emitIdentifier(expr as ts.Identifier)
            case SK.ThisKeyword:
                return this.emitThisExpression(expr as ts.ThisExpression)
            case SK.ElementAccessExpression:
                return this.emitElementAccessExpression(
                    expr as ts.ElementAccessExpression
                )
            case SK.PropertyAccessExpression:
                return this.emitPropertyAccessExpression(
                    expr as ts.PropertyAccessExpression
                )

            case SK.TemplateHead:
            case SK.TemplateMiddle:
            case SK.TemplateTail:
            case SK.NumericLiteral:
            case SK.StringLiteral:
            case SK.NoSubstitutionTemplateLiteral:
                //case SyntaxKind.RegularExpressionLiteral:
                return this.emitLiteralExpression(expr as ts.LiteralExpression)

            case SK.BinaryExpression:
                return this.emitBinaryExpression(expr as ts.BinaryExpression)
            case SK.PrefixUnaryExpression:
                return this.emitUnaryExpression(
                    expr as ts.PrefixUnaryExpression
                )
            case SK.TaggedTemplateExpression:
                return this.emitStringOrBuffer(
                    expr as ts.TaggedTemplateExpression
                )
            case SK.ArrayLiteralExpression:
                return this.emitArrayExpression(
                    expr as ts.ArrayLiteralExpression
                )
            case SK.ObjectLiteralExpression:
                return this.emitObjectExpression(
                    expr as ts.ObjectLiteralExpression
                )
            case SK.ParenthesizedExpression:
                return this.emitExpr(
                    (expr as ts.ParenthesizedExpression).expression
                )
            default:
                // console.log(expr)
                return throwError(expr, "unhandled expr: " + SK[expr.kind])
        }
    }

    private sourceFrag(node: ts.Node) {
        const text = node.getFullText().trim()
        return text.slice(0, 60).replace(/\n[^]*/, "...")
    }

    private handleException(stmt: ts.Node, e: any) {
        if (e.sourceNode !== undefined) {
            const node = e.sourceNode || stmt
            this.reportError(node, e.message)
            // console.log(e.stack)
        } else {
            this.reportError(stmt, "Internal error: " + e.message)
            console.log(e.stack)
        }
    }

    private emitStmt(stmt: ts.Statement) {
        const src = this.sourceFrag(stmt)
        const wr = this.writer
        if (src) wr.emitComment(src)

        wr.stmtStart(this.indexToLine(stmt))

        try {
            switch (stmt.kind) {
                case SK.ExpressionStatement:
                    return this.emitExpressionStatement(
                        stmt as ts.ExpressionStatement
                    )
                case SK.VariableStatement:
                    return this.emitVariableDeclaration(
                        stmt as ts.VariableStatement
                    )
                case SK.IfStatement:
                    return this.emitIfStatement(stmt as ts.IfStatement)
                case SK.WhileStatement:
                    return this.emitWhileStatement(stmt as ts.WhileStatement)
                case SK.Block:
                    stmt.forEachChild(s => this.emitStmt(s as ts.Statement))
                    return
                case SK.ReturnStatement:
                    return this.emitReturnStatement(stmt as ts.ReturnStatement)
                case SK.FunctionDeclaration:
                    return this.emitFunctionDeclaration(
                        stmt as ts.FunctionDeclaration
                    )
                case SK.ExportDeclaration:
                case SK.InterfaceDeclaration:
                    return // ignore
                default:
                    // console.log(stmt)
                    throwError(stmt, `unhandled stmt type: ${SK[stmt.kind]}`)
            }
        } catch (e) {
            this.handleException(stmt, e)
        } finally {
            wr.stmtEnd()
        }
    }

    private assertLittleEndian() {
        const test = new Uint16Array([0xd042])
        assert(toHex(new Uint8Array(test.buffer)) == "42d0")
    }

    private serialize() {
        // serialization only works on little endian machines
        this.assertLittleEndian()

        const fixHeader = new SectionWriter(BinFmt.FIX_HEADER_SIZE)
        const sectDescs = new SectionWriter()
        const sections: SectionWriter[] = [fixHeader, sectDescs]

        const hd = new Uint8Array(BinFmt.FIX_HEADER_SIZE)
        hd.set(
            encodeU32LE([
                BinFmt.MAGIC0,
                BinFmt.MAGIC1,
                BinFmt.IMG_VERSION,
                this.globals.list.length,
            ])
        )
        fixHeader.append(hd)

        const funDesc = new SectionWriter()
        const funData = new SectionWriter()
        const floatData = new SectionWriter()
        const roleData = new SectionWriter()
        const strDesc = new SectionWriter()
        const strData = new SectionWriter()

        const writers = [
            funDesc,
            funData,
            floatData,
            roleData,
            strDesc,
            strData,
        ]

        assert(BinFmt.NUM_IMG_SECTIONS == writers.length)

        for (const s of writers) {
            sectDescs.append(s.desc)
            sections.push(s)
        }

        funDesc.size = BinFmt.FUNCTION_HEADER_SIZE * this.procs.length

        for (const proc of this.procs) {
            funDesc.append(proc.writer.desc)
            proc.writer.offsetInFuncs = funData.currSize
            funData.append(proc.writer.serialize())
        }

        const floatBuf = new Float64Array(this.floatLiterals).buffer
        const nanboxedU32 = new Uint32Array(floatBuf)
        for (let i = 0; i < this.floatLiterals.length; ++i) {
            const f = this.floatLiterals[i]
            if ((f | 0) == f) {
                nanboxedU32[i * 2] = f
                nanboxedU32[i * 2 + 1] = -1
            }
        }
        floatData.append(new Uint8Array(floatBuf))

        for (const r of this.roles.list) {
            roleData.append((r as Role).serialize())
        }

        const descs = this.stringLiterals.map(str => {
            const buf: Uint8Array =
                typeof str == "string"
                    ? stringToUint8Array(toUTF8(str) + "\u0000")
                    : str
            const desc = new Uint8Array(8)
            write32(desc, 0, strData.currSize) // initially use offsets in strData section
            write32(
                desc,
                4,
                typeof str == "string" ? buf.length - 1 : buf.length
            )
            strData.append(buf)
            strDesc.append(desc)
            return desc
        })
        strData.align()

        let off = 0
        for (const s of sections) {
            s.finalize(off)
            off += s.size
        }
        const mask = BinFmt.BINARY_SIZE_ALIGN - 1
        off = (off + mask) & ~mask
        const outp = new Uint8Array(off)

        // shift offsets from strData-local to global
        for (const d of descs) {
            write32(d, 0, read32(d, 0) + strData.offset)
        }

        for (const proc of this.procs) {
            proc.writer.finalizeDesc(
                funData.offset + proc.writer.offsetInFuncs,
                proc.locals.list.length,
                proc.numargs
            )
        }

        off = 0
        for (const s of sections) {
            for (const d of s.data) {
                outp.set(d, off)
                off += d.length
            }
        }

        const left = outp.length - off
        assert(0 <= left && left < BinFmt.BINARY_SIZE_ALIGN)

        return outp
    }

    getAssembly() {
        return this.procs.map(p => p.toString()).join("\n")
    }

    inMainFile(node: ts.Node) {
        return node.getSourceFile() == this.mainFile
    }

    private emitLibrary() {
        if (!this.isLibrary) return

        const q = (b: string | Uint8Array) => {
            if (typeof b == "string") return "s:" + b
            else return "h:" + toHex(b)
        }
        const cleanDesc = (desc: Uint8Array) => {
            // clear offset since it's meaningless in library
            desc = new Uint8Array(desc)
            write32(desc, 0, 0)
            return desc
        }
        const lib = {
            procs: this.procs.map(p => ({
                name: p.name,
                desc: q(cleanDesc(p.writer.desc)),
                body: q(p.writer.serialize()),
            })),
            strings: this.stringLiterals.map(q),
            floats: this.floatLiterals.slice(),
        }
        this.host.write("prog-lib.json", JSON.stringify(lib, null, 1))
    }

    emit() {
        assert(!this.tree)

        this.tree = buildAST(this.host, this._source)
        getProgramDiagnostics(this.tree).forEach(d => this.printDiag(d))

        const files = this.tree.getSourceFiles()
        this.mainFile = files[files.length - 1]

        this.emitProgram(this.tree)

        this.finalizeCloudMethods()
        this.finalizeDispatchers()
        for (const p of this.procs) p.finalize()

        // early assembly dump, in case serialization fails
        if (this.numErrors == 0)
            this.host.write("prog.jasm", this.getAssembly())

        const b = this.serialize()
        const dbg: DebugInfo = {
            roles: this.roles.list.map(r => (r as Role).debugInfo()),
            functions: this.procs.map(p => p.debugInfo()),
            globals: this.globals.list.map(r => r.debugInfo()),
            source: this._source,
        }
        this.host.write("prog.jacs", b)
        const progJson = {
            text: this._source,
            blocks: "",
            compiled: toHex(b),
        }
        this.host.write("prog-body.json", JSON.stringify(progJson, null, 4))
        this.host.write("prog-dbg.json", JSON.stringify(dbg))

        // write assembly again
        if (this.numErrors == 0)
            this.host.write("prog.jasm", this.getAssembly())

        if (this.numErrors == 0) {
            try {
                this.host?.verifyBytecode(b, dbg)
            } catch (e) {
                this.reportError(this.mainFile, e.message)
            }
        }

        if (this.numErrors == 0) this.emitLibrary()

        const clientSpecs: jdspec.ServiceSpec[] = []
        for (const kn of Object.keys(this.clientCommands)) {
            const lst = this.clientCommands[kn]
                .filter(c => c.isFresh)
                .map(c => c.pktSpec)
            if (lst.length > 0) {
                const s = this.clientCommands[kn][0].serviceSpec
                clientSpecs.push({
                    name: s.name,
                    camelName: s.camelName,
                    shortId: s.shortId,
                    shortName: s.shortName,
                    classIdentifier: s.classIdentifier,
                    status: undefined,
                    extends: undefined,
                    notes: undefined,
                    enums: undefined,
                    tags: undefined,
                    constants: undefined,
                    packets: lst,
                })
            }
        }

        return {
            success: this.numErrors == 0,
            binary: b,
            dbg: dbg,
            clientSpecs,
        }
    }
}

export function compile(
    host: Host,
    code: string,
    opts: { isLibrary?: boolean } = {}
) {
    const p = new Program(host, code)
    if (opts.isLibrary) p.isLibrary = true
    return p.emit()
}

export function testCompiler(host: Host, code: string) {
    const lines = code.split(/\r?\n/).map(s => {
        const m = /\/\/\s*!\s*(.*)/.exec(s)
        if (m) return m[1]
        else return null
    })
    const numerr = lines.filter(s => !!s).length
    let numExtra = 0
    const p = new Program(
        {
            write: () => {},
            log: msg => {},
            getSpecs: host.getSpecs,
            verifyBytecode: host.verifyBytecode,
            mainFileName: host.mainFileName,
            error: err => {
                let isOK = false
                if (err.file) {
                    const { line } = ts.getLineAndCharacterOfPosition(
                        err.file,
                        err.start
                    )
                    const exp = lines[line]
                    const text = ts.flattenDiagnosticMessageText(
                        err.messageText,
                        "\n"
                    )
                    if (exp != null && text.indexOf(exp) >= 0) {
                        lines[line] = "" // allow more errors on the same line
                        isOK = true
                    }
                }

                if (!isOK) {
                    numExtra++
                    console.error(formatDiagnostics([err]))
                }
            },
        },
        code
    )
    const r = p.emit()
    let missingErrs = 0
    for (let i = 0; i < lines.length; ++i) {
        if (lines[i]) {
            const msg = "missing error: " + lines[i]
            const fn = host.mainFileName?.() || ""
            console.error(`${fn}(${i + 1},${1}): ${msg}`)
            missingErrs++
        }
    }
    if (missingErrs) throw new Error("some errors were not reported")
    if (numExtra) throw new Error("extra errors reported")
    if (numerr && r.success) throw new Error("unexpected success")

    if (r.success) {
        const cont = p.getAssembly()
        if (cont.indexOf("???oops") >= 0) {
            console.log(cont)
            throw new Error("bad disassembly")
        }
    }
}

"use strict";(self.webpackChunkwebsite=self.webpackChunkwebsite||[]).push([[4497],{35318:(t,e,n)=>{n.d(e,{Zo:()=>c,kt:()=>g});var r=n(27378);function a(t,e,n){return e in t?Object.defineProperty(t,e,{value:n,enumerable:!0,configurable:!0,writable:!0}):t[e]=n,t}function i(t,e){var n=Object.keys(t);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(t);e&&(r=r.filter((function(e){return Object.getOwnPropertyDescriptor(t,e).enumerable}))),n.push.apply(n,r)}return n}function p(t){for(var e=1;e<arguments.length;e++){var n=null!=arguments[e]?arguments[e]:{};e%2?i(Object(n),!0).forEach((function(e){a(t,e,n[e])})):Object.getOwnPropertyDescriptors?Object.defineProperties(t,Object.getOwnPropertyDescriptors(n)):i(Object(n)).forEach((function(e){Object.defineProperty(t,e,Object.getOwnPropertyDescriptor(n,e))}))}return t}function o(t,e){if(null==t)return{};var n,r,a=function(t,e){if(null==t)return{};var n,r,a={},i=Object.keys(t);for(r=0;r<i.length;r++)n=i[r],e.indexOf(n)>=0||(a[n]=t[n]);return a}(t,e);if(Object.getOwnPropertySymbols){var i=Object.getOwnPropertySymbols(t);for(r=0;r<i.length;r++)n=i[r],e.indexOf(n)>=0||Object.prototype.propertyIsEnumerable.call(t,n)&&(a[n]=t[n])}return a}var l=r.createContext({}),d=function(t){var e=r.useContext(l),n=e;return t&&(n="function"==typeof t?t(e):p(p({},e),t)),n},c=function(t){var e=d(t.components);return r.createElement(l.Provider,{value:e},t.children)},m="mdxType",s={inlineCode:"code",wrapper:function(t){var e=t.children;return r.createElement(r.Fragment,{},e)}},k=r.forwardRef((function(t,e){var n=t.components,a=t.mdxType,i=t.originalType,l=t.parentName,c=o(t,["components","mdxType","originalType","parentName"]),m=d(n),k=a,g=m["".concat(l,".").concat(k)]||m[k]||s[k]||i;return n?r.createElement(g,p(p({ref:e},c),{},{components:n})):r.createElement(g,p({ref:e},c))}));function g(t,e){var n=arguments,a=e&&e.mdxType;if("string"==typeof t||a){var i=n.length,p=new Array(i);p[0]=k;var o={};for(var l in e)hasOwnProperty.call(e,l)&&(o[l]=e[l]);o.originalType=t,o[m]="string"==typeof t?t:a,p[1]=o;for(var d=2;d<i;d++)p[d]=n[d];return r.createElement.apply(null,p)}return r.createElement.apply(null,n)}k.displayName="MDXCreateElement"},234:(t,e,n)=>{n.r(e),n.d(e,{assets:()=>l,contentTitle:()=>p,default:()=>s,frontMatter:()=>i,metadata:()=>o,toc:()=>d});var r=n(25773),a=(n(27378),n(35318));const i={description:"KittenBot NanoScript 1.0"},p="KittenBot NanoScript 1.0",o={unversionedId:"devices/rp2040/kittenbot-nanoscript",id:"devices/rp2040/kittenbot-nanoscript",title:"KittenBot NanoScript 1.0",description:"KittenBot NanoScript 1.0",source:"@site/docs/devices/rp2040/kittenbot-nanoscript.mdx",sourceDirName:"devices/rp2040",slug:"/devices/rp2040/kittenbot-nanoscript",permalink:"/devicescript/devices/rp2040/kittenbot-nanoscript",draft:!1,tags:[],version:"current",frontMatter:{description:"KittenBot NanoScript 1.0"},sidebar:"tutorialSidebar",previous:{title:"RP2040",permalink:"/devicescript/devices/rp2040/"},next:{title:"MSR RP2040 Brain 124 v0.1",permalink:"/devicescript/devices/rp2040/msr124"}},l={},d=[{value:"Features",id:"features",level:2},{value:"Stores",id:"stores",level:2},{value:"Pins",id:"pins",level:2},{value:"DeviceScript import",id:"devicescript-import",level:2},{value:"Firmware update",id:"firmware-update",level:2},{value:"Configuration",id:"configuration",level:2}],c={toc:d},m="wrapper";function s(t){let{components:e,...n}=t;return(0,a.kt)(m,(0,r.Z)({},c,n,{components:e,mdxType:"MDXLayout"}),(0,a.kt)("h1",{id:"kittenbot-nanoscript-10"},"KittenBot NanoScript 1.0"),(0,a.kt)("p",null,"A RP2040 board featuring a Jacdac connector, compatible with SMT-mounting."),(0,a.kt)("p",null,(0,a.kt)("img",{parentName:"p",src:"https://microsoft.github.io/jacdac-docs/images/devices/kittenbot/nanoscript2040v10.catalog.jpg",alt:"KittenBot NanoScript 1.0 picture"})),(0,a.kt)("h2",{id:"features"},"Features"),(0,a.kt)("ul",null,(0,a.kt)("li",{parentName:"ul"},"Jacdac on pin 9 using Jacdac connector"),(0,a.kt)("li",{parentName:"ul"},"RGB LED on pins 16, 14, 15  (use ",(0,a.kt)("a",{parentName:"li",href:"/developer/status-light"},"setStatusLight")," to control)"),(0,a.kt)("li",{parentName:"ul"},"Serial logging on pin 0 at 115200 8N1")),(0,a.kt)("p",null),(0,a.kt)("ul",null,(0,a.kt)("li",{parentName:"ul"},"Service: power (auto-start)")),(0,a.kt)("p",null),(0,a.kt)("admonition",{type:"caution"},(0,a.kt)("p",{parentName:"admonition"},"I2C pins are not ",(0,a.kt)("a",{parentName:"p",href:"/developer/board-configuration"},"configured"),".")),(0,a.kt)("h2",{id:"stores"},"Stores"),(0,a.kt)("ul",null,(0,a.kt)("li",{parentName:"ul"},(0,a.kt)("a",{parentName:"li",href:"https://www.kittenbot.cc/products/devicescript-enhanced-development-board-with-rp2040"},"https://www.kittenbot.cc/products/devicescript-enhanced-development-board-with-rp2040"))),(0,a.kt)("h2",{id:"pins"},"Pins"),(0,a.kt)("table",null,(0,a.kt)("thead",{parentName:"table"},(0,a.kt)("tr",{parentName:"thead"},(0,a.kt)("th",{parentName:"tr",align:"left"},"pin name"),(0,a.kt)("th",{parentName:"tr",align:"left"},"hardware id"),(0,a.kt)("th",{parentName:"tr",align:"right"},"features"))),(0,a.kt)("tbody",{parentName:"table"},(0,a.kt)("tr",{parentName:"tbody"},(0,a.kt)("td",{parentName:"tr",align:"left"},(0,a.kt)("strong",{parentName:"td"},"P1")),(0,a.kt)("td",{parentName:"tr",align:"left"},"GPIO1"),(0,a.kt)("td",{parentName:"tr",align:"right"},"io")),(0,a.kt)("tr",{parentName:"tbody"},(0,a.kt)("td",{parentName:"tr",align:"left"},(0,a.kt)("strong",{parentName:"td"},"P10")),(0,a.kt)("td",{parentName:"tr",align:"left"},"GPIO10"),(0,a.kt)("td",{parentName:"tr",align:"right"},"io")),(0,a.kt)("tr",{parentName:"tbody"},(0,a.kt)("td",{parentName:"tr",align:"left"},(0,a.kt)("strong",{parentName:"td"},"P2")),(0,a.kt)("td",{parentName:"tr",align:"left"},"GPIO2"),(0,a.kt)("td",{parentName:"tr",align:"right"},"io")),(0,a.kt)("tr",{parentName:"tbody"},(0,a.kt)("td",{parentName:"tr",align:"left"},(0,a.kt)("strong",{parentName:"td"},"P24")),(0,a.kt)("td",{parentName:"tr",align:"left"},"GPIO24"),(0,a.kt)("td",{parentName:"tr",align:"right"},"io")),(0,a.kt)("tr",{parentName:"tbody"},(0,a.kt)("td",{parentName:"tr",align:"left"},(0,a.kt)("strong",{parentName:"td"},"P25")),(0,a.kt)("td",{parentName:"tr",align:"left"},"GPIO25"),(0,a.kt)("td",{parentName:"tr",align:"right"},"io")),(0,a.kt)("tr",{parentName:"tbody"},(0,a.kt)("td",{parentName:"tr",align:"left"},(0,a.kt)("strong",{parentName:"td"},"P26")),(0,a.kt)("td",{parentName:"tr",align:"left"},"GPIO26"),(0,a.kt)("td",{parentName:"tr",align:"right"},"analogIn,  io")),(0,a.kt)("tr",{parentName:"tbody"},(0,a.kt)("td",{parentName:"tr",align:"left"},(0,a.kt)("strong",{parentName:"td"},"P27")),(0,a.kt)("td",{parentName:"tr",align:"left"},"GPIO27"),(0,a.kt)("td",{parentName:"tr",align:"right"},"analogIn,  io")),(0,a.kt)("tr",{parentName:"tbody"},(0,a.kt)("td",{parentName:"tr",align:"left"},(0,a.kt)("strong",{parentName:"td"},"P28")),(0,a.kt)("td",{parentName:"tr",align:"left"},"GPIO28"),(0,a.kt)("td",{parentName:"tr",align:"right"},"analogIn,  io")),(0,a.kt)("tr",{parentName:"tbody"},(0,a.kt)("td",{parentName:"tr",align:"left"},(0,a.kt)("strong",{parentName:"td"},"P29")),(0,a.kt)("td",{parentName:"tr",align:"left"},"GPIO29"),(0,a.kt)("td",{parentName:"tr",align:"right"},"analogIn,  io")),(0,a.kt)("tr",{parentName:"tbody"},(0,a.kt)("td",{parentName:"tr",align:"left"},(0,a.kt)("strong",{parentName:"td"},"P3")),(0,a.kt)("td",{parentName:"tr",align:"left"},"GPIO3"),(0,a.kt)("td",{parentName:"tr",align:"right"},"io")),(0,a.kt)("tr",{parentName:"tbody"},(0,a.kt)("td",{parentName:"tr",align:"left"},(0,a.kt)("strong",{parentName:"td"},"P4")),(0,a.kt)("td",{parentName:"tr",align:"left"},"GPIO4"),(0,a.kt)("td",{parentName:"tr",align:"right"},"io")),(0,a.kt)("tr",{parentName:"tbody"},(0,a.kt)("td",{parentName:"tr",align:"left"},(0,a.kt)("strong",{parentName:"td"},"P5")),(0,a.kt)("td",{parentName:"tr",align:"left"},"GPIO5"),(0,a.kt)("td",{parentName:"tr",align:"right"},"io")),(0,a.kt)("tr",{parentName:"tbody"},(0,a.kt)("td",{parentName:"tr",align:"left"},(0,a.kt)("strong",{parentName:"td"},"P6")),(0,a.kt)("td",{parentName:"tr",align:"left"},"GPIO6"),(0,a.kt)("td",{parentName:"tr",align:"right"},"io")),(0,a.kt)("tr",{parentName:"tbody"},(0,a.kt)("td",{parentName:"tr",align:"left"},(0,a.kt)("strong",{parentName:"td"},"P7")),(0,a.kt)("td",{parentName:"tr",align:"left"},"GPIO7"),(0,a.kt)("td",{parentName:"tr",align:"right"},"io")),(0,a.kt)("tr",{parentName:"tbody"},(0,a.kt)("td",{parentName:"tr",align:"left"},(0,a.kt)("strong",{parentName:"td"},"jacdac.pin")),(0,a.kt)("td",{parentName:"tr",align:"left"},"GPIO9"),(0,a.kt)("td",{parentName:"tr",align:"right"},"jacdac.pin,  io")),(0,a.kt)("tr",{parentName:"tbody"},(0,a.kt)("td",{parentName:"tr",align:"left"},(0,a.kt)("strong",{parentName:"td"},"led.rgb","[0]",".pin")),(0,a.kt)("td",{parentName:"tr",align:"left"},"GPIO16"),(0,a.kt)("td",{parentName:"tr",align:"right"},"led.rgb","[0]",".pin,  io")),(0,a.kt)("tr",{parentName:"tbody"},(0,a.kt)("td",{parentName:"tr",align:"left"},(0,a.kt)("strong",{parentName:"td"},"led.rgb","[1]",".pin")),(0,a.kt)("td",{parentName:"tr",align:"left"},"GPIO14"),(0,a.kt)("td",{parentName:"tr",align:"right"},"led.rgb","[1]",".pin,  io")),(0,a.kt)("tr",{parentName:"tbody"},(0,a.kt)("td",{parentName:"tr",align:"left"},(0,a.kt)("strong",{parentName:"td"},"led.rgb","[2]",".pin")),(0,a.kt)("td",{parentName:"tr",align:"left"},"GPIO15"),(0,a.kt)("td",{parentName:"tr",align:"right"},"led.rgb","[2]",".pin,  io")),(0,a.kt)("tr",{parentName:"tbody"},(0,a.kt)("td",{parentName:"tr",align:"left"},(0,a.kt)("strong",{parentName:"td"},"log.pinTX")),(0,a.kt)("td",{parentName:"tr",align:"left"},"GPIO0"),(0,a.kt)("td",{parentName:"tr",align:"right"},"log.pinTX,  io")),(0,a.kt)("tr",{parentName:"tbody"},(0,a.kt)("td",{parentName:"tr",align:"left"},(0,a.kt)("strong",{parentName:"td"},"services.power","[0]",".pinEn")),(0,a.kt)("td",{parentName:"tr",align:"left"},"GPIO22"),(0,a.kt)("td",{parentName:"tr",align:"right"},"services.power","[0]",".pinEn,  io")),(0,a.kt)("tr",{parentName:"tbody"},(0,a.kt)("td",{parentName:"tr",align:"left"},(0,a.kt)("strong",{parentName:"td"},"services.power","[0]",".pinFault")),(0,a.kt)("td",{parentName:"tr",align:"left"},"GPIO12"),(0,a.kt)("td",{parentName:"tr",align:"right"},"services.power","[0]",".pinFault,  io")),(0,a.kt)("tr",{parentName:"tbody"},(0,a.kt)("td",{parentName:"tr",align:"left"},(0,a.kt)("strong",{parentName:"td"},"services.power","[0]",".pinLedPulse")),(0,a.kt)("td",{parentName:"tr",align:"left"},"GPIO13"),(0,a.kt)("td",{parentName:"tr",align:"right"},"services.power","[0]",".pinLedPulse,  io")),(0,a.kt)("tr",{parentName:"tbody"},(0,a.kt)("td",{parentName:"tr",align:"left"},(0,a.kt)("strong",{parentName:"td"},"services.power","[0]",".pinPulse")),(0,a.kt)("td",{parentName:"tr",align:"left"},"GPIO8"),(0,a.kt)("td",{parentName:"tr",align:"right"},"services.power","[0]",".pinPulse,  io")),(0,a.kt)("tr",{parentName:"tbody"},(0,a.kt)("td",{parentName:"tr",align:"left"},(0,a.kt)("strong",{parentName:"td"},"services.power","[0]",".pinUsbDetect")),(0,a.kt)("td",{parentName:"tr",align:"left"},"GPIO11"),(0,a.kt)("td",{parentName:"tr",align:"right"},"services.power","[0]",".pinUsbDetect,  io")))),(0,a.kt)("h2",{id:"devicescript-import"},"DeviceScript import"),(0,a.kt)("p",null,"You must add this import statement to load\nthe pinout configuration for this device."),(0,a.kt)("p",null,"In ",(0,a.kt)("a",{parentName:"p",href:"/getting-started/vscode"},"Visual Studio Code"),",\nclick the ",(0,a.kt)("strong",{parentName:"p"},"wand"),' icon on the file menu and\nselect "KittenBot NanoScript 1.0".'),(0,a.kt)("pre",null,(0,a.kt)("code",{parentName:"pre",className:"language-ts"},'import { pins, board } from "@dsboard/kittenbot_nanoscript"\n')),(0,a.kt)("p",null),(0,a.kt)("h2",{id:"firmware-update"},"Firmware update"),(0,a.kt)("p",null,"In Visual Studio Code,\nselect ",(0,a.kt)("strong",{parentName:"p"},"DeviceScript: Flash Firmware...")," from the command palette."),(0,a.kt)("p",null,"Run this ",(0,a.kt)("a",{parentName:"p",href:"/api/cli"},"command line")," command and follow the instructions."),(0,a.kt)("pre",null,(0,a.kt)("code",{parentName:"pre",className:"language-bash"},"devicescript flash --board kittenbot_nanoscript\n")),(0,a.kt)("ul",null,(0,a.kt)("li",{parentName:"ul"},(0,a.kt)("a",{parentName:"li",href:"https://github.com/microsoft/devicescript-pico/releases/latest/download/devicescript-rp2040-kittenbot_nanoscript.uf2"},"Firmware"))),(0,a.kt)("h2",{id:"configuration"},"Configuration"),(0,a.kt)("pre",null,(0,a.kt)("code",{parentName:"pre",className:"language-json",metastring:'title="kittenbot_nanoscript.json"',title:'"kittenbot_nanoscript.json"'},'{\n    "$schema": "https://raw.githubusercontent.com/microsoft/devicescript-pico/main/boards/rp2040deviceconfig.schema.json",\n    "id": "kittenbot_nanoscript",\n    "devName": "KittenBot NanoScript 1.0",\n    "productId": "0x37c2fcc5",\n    "$description": "A RP2040 board featuring a Jacdac connector, compatible with SMT-mounting.",\n    "archId": "rp2040",\n    "url": "https://www.kittenbot.cc/products/devicescript-enhanced-development-board-with-rp2040",\n    "jacdac": {\n        "$connector": "Jacdac",\n        "pin": 9\n    },\n    "led": {\n        "rgb": [\n            {\n                "mult": 250,\n                "pin": 16\n            },\n            {\n                "mult": 60,\n                "pin": 14\n            },\n            {\n                "mult": 150,\n                "pin": 15\n            }\n        ]\n    },\n    "log": {\n        "baud": 115200,\n        "pinTX": 0\n    },\n    "pins": {\n        "@HILIM": 18,\n        "P1": 1,\n        "P10": 10,\n        "P2": 2,\n        "P24": 24,\n        "P25": 25,\n        "P26": 26,\n        "P27": 27,\n        "P28": 28,\n        "P29": 29,\n        "P3": 3,\n        "P4": 4,\n        "P5": 5,\n        "P6": 6,\n        "P7": 7\n    },\n    "sPin": {\n        "#": "enable high power limiter mode",\n        "@HILIM": 0\n    },\n    "services": [\n        {\n            "faultIgnoreMs": 1000,\n            "mode": 3,\n            "name": "power",\n            "pinEn": 22,\n            "pinFault": 12,\n            "pinLedPulse": 13,\n            "pinPulse": 8,\n            "pinUsbDetect": 11,\n            "service": "power"\n        }\n    ]\n}\n')))}s.isMDXComponent=!0}}]);
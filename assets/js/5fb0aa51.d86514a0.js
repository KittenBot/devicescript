"use strict";(self.webpackChunkwebsite=self.webpackChunkwebsite||[]).push([[3709],{35318:(t,e,r)=>{r.d(e,{Zo:()=>m,kt:()=>g});var a=r(27378);function n(t,e,r){return e in t?Object.defineProperty(t,e,{value:r,enumerable:!0,configurable:!0,writable:!0}):t[e]=r,t}function i(t,e){var r=Object.keys(t);if(Object.getOwnPropertySymbols){var a=Object.getOwnPropertySymbols(t);e&&(a=a.filter((function(e){return Object.getOwnPropertyDescriptor(t,e).enumerable}))),r.push.apply(r,a)}return r}function p(t){for(var e=1;e<arguments.length;e++){var r=null!=arguments[e]?arguments[e]:{};e%2?i(Object(r),!0).forEach((function(e){n(t,e,r[e])})):Object.getOwnPropertyDescriptors?Object.defineProperties(t,Object.getOwnPropertyDescriptors(r)):i(Object(r)).forEach((function(e){Object.defineProperty(t,e,Object.getOwnPropertyDescriptor(r,e))}))}return t}function o(t,e){if(null==t)return{};var r,a,n=function(t,e){if(null==t)return{};var r,a,n={},i=Object.keys(t);for(a=0;a<i.length;a++)r=i[a],e.indexOf(r)>=0||(n[r]=t[r]);return n}(t,e);if(Object.getOwnPropertySymbols){var i=Object.getOwnPropertySymbols(t);for(a=0;a<i.length;a++)r=i[a],e.indexOf(r)>=0||Object.prototype.propertyIsEnumerable.call(t,r)&&(n[r]=t[r])}return n}var l=a.createContext({}),d=function(t){var e=a.useContext(l),r=e;return t&&(r="function"==typeof t?t(e):p(p({},e),t)),r},m=function(t){var e=d(t.components);return a.createElement(l.Provider,{value:e},t.children)},s="mdxType",c={inlineCode:"code",wrapper:function(t){var e=t.children;return a.createElement(a.Fragment,{},e)}},k=a.forwardRef((function(t,e){var r=t.components,n=t.mdxType,i=t.originalType,l=t.parentName,m=o(t,["components","mdxType","originalType","parentName"]),s=d(r),k=n,g=s["".concat(l,".").concat(k)]||s[k]||c[k]||i;return r?a.createElement(g,p(p({ref:e},m),{},{components:r})):a.createElement(g,p({ref:e},m))}));function g(t,e){var r=arguments,n=e&&e.mdxType;if("string"==typeof t||n){var i=r.length,p=new Array(i);p[0]=k;var o={};for(var l in e)hasOwnProperty.call(e,l)&&(o[l]=e[l]);o.originalType=t,o[s]="string"==typeof t?t:n,p[1]=o;for(var d=2;d<i;d++)p[d]=r[d];return a.createElement.apply(null,p)}return a.createElement.apply(null,r)}k.displayName="MDXCreateElement"},90565:(t,e,r)=>{r.r(e),r.d(e,{assets:()=>l,contentTitle:()=>p,default:()=>c,frontMatter:()=>i,metadata:()=>o,toc:()=>d});var a=r(25773),n=(r(27378),r(35318));const i={description:"Raspberry Pi Pico W"},p="Raspberry Pi Pico W",o={unversionedId:"devices/rp2040/pico-w",id:"devices/rp2040/pico-w",title:"Raspberry Pi Pico W",description:"Raspberry Pi Pico W",source:"@site/docs/devices/rp2040/pico-w.mdx",sourceDirName:"devices/rp2040",slug:"/devices/rp2040/pico-w",permalink:"/devicescript/devices/rp2040/pico-w",draft:!1,tags:[],version:"current",frontMatter:{description:"Raspberry Pi Pico W"},sidebar:"tutorialSidebar",previous:{title:"MSR Brain RP2040 59 v0.1",permalink:"/devicescript/devices/rp2040/msr59"},next:{title:"Raspberry Pi Pico",permalink:"/devicescript/devices/rp2040/pico"}},l={},d=[{value:"Features",id:"features",level:2},{value:"Stores",id:"stores",level:2},{value:"Pins",id:"pins",level:2},{value:"DeviceScript import",id:"devicescript-import",level:2},{value:"Firmware update",id:"firmware-update",level:2},{value:"Configuration",id:"configuration",level:2}],m={toc:d},s="wrapper";function c(t){let{components:e,...r}=t;return(0,n.kt)(s,(0,a.Z)({},m,r,{components:e,mdxType:"MDXLayout"}),(0,n.kt)("h1",{id:"raspberry-pi-pico-w"},"Raspberry Pi Pico W"),(0,n.kt)("p",null,"RP2040 board from Raspberry Pi with a WiFi chip."),(0,n.kt)("p",null,(0,n.kt)("img",{parentName:"p",src:"https://microsoft.github.io/jacdac-docs/images/devices/raspberry-pi/picowv00.catalog.jpg",alt:"Raspberry Pi Pico W picture"})),(0,n.kt)("h2",{id:"features"},"Features"),(0,n.kt)("ul",null,(0,n.kt)("li",{parentName:"ul"},"custom LED  (use ",(0,n.kt)("a",{parentName:"li",href:"/developer/status-light"},"setStatusLight")," to control)")),(0,n.kt)("p",null),(0,n.kt)("p",null),(0,n.kt)("admonition",{type:"caution"},(0,n.kt)("p",{parentName:"admonition"},"I2C pins are not ",(0,n.kt)("a",{parentName:"p",href:"/developer/board-configuration"},"configured"),".")),(0,n.kt)("h2",{id:"stores"},"Stores"),(0,n.kt)("ul",null,(0,n.kt)("li",{parentName:"ul"},(0,n.kt)("a",{parentName:"li",href:"https://www.raspberrypi.com/documentation/microcontrollers/raspberry-pi-pico.html"},"https://www.raspberrypi.com/documentation/microcontrollers/raspberry-pi-pico.html")),(0,n.kt)("li",{parentName:"ul"},(0,n.kt)("a",{parentName:"li",href:"https://www.raspberrypi.com/products/raspberry-pi-pico/"},"https://www.raspberrypi.com/products/raspberry-pi-pico/"))),(0,n.kt)("h2",{id:"pins"},"Pins"),(0,n.kt)("table",null,(0,n.kt)("thead",{parentName:"table"},(0,n.kt)("tr",{parentName:"thead"},(0,n.kt)("th",{parentName:"tr",align:"left"},"pin name"),(0,n.kt)("th",{parentName:"tr",align:"left"},"hardware id"),(0,n.kt)("th",{parentName:"tr",align:"right"},"features"))),(0,n.kt)("tbody",{parentName:"table"},(0,n.kt)("tr",{parentName:"tbody"},(0,n.kt)("td",{parentName:"tr",align:"left"},(0,n.kt)("strong",{parentName:"td"},"GP0")),(0,n.kt)("td",{parentName:"tr",align:"left"},"GPIO0"),(0,n.kt)("td",{parentName:"tr",align:"right"},"io")),(0,n.kt)("tr",{parentName:"tbody"},(0,n.kt)("td",{parentName:"tr",align:"left"},(0,n.kt)("strong",{parentName:"td"},"GP1")),(0,n.kt)("td",{parentName:"tr",align:"left"},"GPIO1"),(0,n.kt)("td",{parentName:"tr",align:"right"},"io")),(0,n.kt)("tr",{parentName:"tbody"},(0,n.kt)("td",{parentName:"tr",align:"left"},(0,n.kt)("strong",{parentName:"td"},"GP10")),(0,n.kt)("td",{parentName:"tr",align:"left"},"GPIO10"),(0,n.kt)("td",{parentName:"tr",align:"right"},"io")),(0,n.kt)("tr",{parentName:"tbody"},(0,n.kt)("td",{parentName:"tr",align:"left"},(0,n.kt)("strong",{parentName:"td"},"GP11")),(0,n.kt)("td",{parentName:"tr",align:"left"},"GPIO11"),(0,n.kt)("td",{parentName:"tr",align:"right"},"io")),(0,n.kt)("tr",{parentName:"tbody"},(0,n.kt)("td",{parentName:"tr",align:"left"},(0,n.kt)("strong",{parentName:"td"},"GP12")),(0,n.kt)("td",{parentName:"tr",align:"left"},"GPIO12"),(0,n.kt)("td",{parentName:"tr",align:"right"},"io")),(0,n.kt)("tr",{parentName:"tbody"},(0,n.kt)("td",{parentName:"tr",align:"left"},(0,n.kt)("strong",{parentName:"td"},"GP13")),(0,n.kt)("td",{parentName:"tr",align:"left"},"GPIO13"),(0,n.kt)("td",{parentName:"tr",align:"right"},"io")),(0,n.kt)("tr",{parentName:"tbody"},(0,n.kt)("td",{parentName:"tr",align:"left"},(0,n.kt)("strong",{parentName:"td"},"GP14")),(0,n.kt)("td",{parentName:"tr",align:"left"},"GPIO14"),(0,n.kt)("td",{parentName:"tr",align:"right"},"io")),(0,n.kt)("tr",{parentName:"tbody"},(0,n.kt)("td",{parentName:"tr",align:"left"},(0,n.kt)("strong",{parentName:"td"},"GP15")),(0,n.kt)("td",{parentName:"tr",align:"left"},"GPIO15"),(0,n.kt)("td",{parentName:"tr",align:"right"},"io")),(0,n.kt)("tr",{parentName:"tbody"},(0,n.kt)("td",{parentName:"tr",align:"left"},(0,n.kt)("strong",{parentName:"td"},"GP16")),(0,n.kt)("td",{parentName:"tr",align:"left"},"GPIO16"),(0,n.kt)("td",{parentName:"tr",align:"right"},"io")),(0,n.kt)("tr",{parentName:"tbody"},(0,n.kt)("td",{parentName:"tr",align:"left"},(0,n.kt)("strong",{parentName:"td"},"GP17")),(0,n.kt)("td",{parentName:"tr",align:"left"},"GPIO17"),(0,n.kt)("td",{parentName:"tr",align:"right"},"io")),(0,n.kt)("tr",{parentName:"tbody"},(0,n.kt)("td",{parentName:"tr",align:"left"},(0,n.kt)("strong",{parentName:"td"},"GP18")),(0,n.kt)("td",{parentName:"tr",align:"left"},"GPIO18"),(0,n.kt)("td",{parentName:"tr",align:"right"},"io")),(0,n.kt)("tr",{parentName:"tbody"},(0,n.kt)("td",{parentName:"tr",align:"left"},(0,n.kt)("strong",{parentName:"td"},"GP19")),(0,n.kt)("td",{parentName:"tr",align:"left"},"GPIO19"),(0,n.kt)("td",{parentName:"tr",align:"right"},"io")),(0,n.kt)("tr",{parentName:"tbody"},(0,n.kt)("td",{parentName:"tr",align:"left"},(0,n.kt)("strong",{parentName:"td"},"GP2")),(0,n.kt)("td",{parentName:"tr",align:"left"},"GPIO2"),(0,n.kt)("td",{parentName:"tr",align:"right"},"io")),(0,n.kt)("tr",{parentName:"tbody"},(0,n.kt)("td",{parentName:"tr",align:"left"},(0,n.kt)("strong",{parentName:"td"},"GP20")),(0,n.kt)("td",{parentName:"tr",align:"left"},"GPIO20"),(0,n.kt)("td",{parentName:"tr",align:"right"},"io")),(0,n.kt)("tr",{parentName:"tbody"},(0,n.kt)("td",{parentName:"tr",align:"left"},(0,n.kt)("strong",{parentName:"td"},"GP21")),(0,n.kt)("td",{parentName:"tr",align:"left"},"GPIO21"),(0,n.kt)("td",{parentName:"tr",align:"right"},"io")),(0,n.kt)("tr",{parentName:"tbody"},(0,n.kt)("td",{parentName:"tr",align:"left"},(0,n.kt)("strong",{parentName:"td"},"GP22")),(0,n.kt)("td",{parentName:"tr",align:"left"},"GPIO22"),(0,n.kt)("td",{parentName:"tr",align:"right"},"io")),(0,n.kt)("tr",{parentName:"tbody"},(0,n.kt)("td",{parentName:"tr",align:"left"},(0,n.kt)("strong",{parentName:"td"},"GP26")),(0,n.kt)("td",{parentName:"tr",align:"left"},"GPIO26"),(0,n.kt)("td",{parentName:"tr",align:"right"},"analogIn,  io")),(0,n.kt)("tr",{parentName:"tbody"},(0,n.kt)("td",{parentName:"tr",align:"left"},(0,n.kt)("strong",{parentName:"td"},"GP27")),(0,n.kt)("td",{parentName:"tr",align:"left"},"GPIO27"),(0,n.kt)("td",{parentName:"tr",align:"right"},"analogIn,  io")),(0,n.kt)("tr",{parentName:"tbody"},(0,n.kt)("td",{parentName:"tr",align:"left"},(0,n.kt)("strong",{parentName:"td"},"GP28")),(0,n.kt)("td",{parentName:"tr",align:"left"},"GPIO28"),(0,n.kt)("td",{parentName:"tr",align:"right"},"analogIn,  io")),(0,n.kt)("tr",{parentName:"tbody"},(0,n.kt)("td",{parentName:"tr",align:"left"},(0,n.kt)("strong",{parentName:"td"},"GP3")),(0,n.kt)("td",{parentName:"tr",align:"left"},"GPIO3"),(0,n.kt)("td",{parentName:"tr",align:"right"},"io")),(0,n.kt)("tr",{parentName:"tbody"},(0,n.kt)("td",{parentName:"tr",align:"left"},(0,n.kt)("strong",{parentName:"td"},"GP4")),(0,n.kt)("td",{parentName:"tr",align:"left"},"GPIO4"),(0,n.kt)("td",{parentName:"tr",align:"right"},"io")),(0,n.kt)("tr",{parentName:"tbody"},(0,n.kt)("td",{parentName:"tr",align:"left"},(0,n.kt)("strong",{parentName:"td"},"GP5")),(0,n.kt)("td",{parentName:"tr",align:"left"},"GPIO5"),(0,n.kt)("td",{parentName:"tr",align:"right"},"io")),(0,n.kt)("tr",{parentName:"tbody"},(0,n.kt)("td",{parentName:"tr",align:"left"},(0,n.kt)("strong",{parentName:"td"},"GP6")),(0,n.kt)("td",{parentName:"tr",align:"left"},"GPIO6"),(0,n.kt)("td",{parentName:"tr",align:"right"},"io")),(0,n.kt)("tr",{parentName:"tbody"},(0,n.kt)("td",{parentName:"tr",align:"left"},(0,n.kt)("strong",{parentName:"td"},"GP7")),(0,n.kt)("td",{parentName:"tr",align:"left"},"GPIO7"),(0,n.kt)("td",{parentName:"tr",align:"right"},"io")),(0,n.kt)("tr",{parentName:"tbody"},(0,n.kt)("td",{parentName:"tr",align:"left"},(0,n.kt)("strong",{parentName:"td"},"GP8")),(0,n.kt)("td",{parentName:"tr",align:"left"},"GPIO8"),(0,n.kt)("td",{parentName:"tr",align:"right"},"io")),(0,n.kt)("tr",{parentName:"tbody"},(0,n.kt)("td",{parentName:"tr",align:"left"},(0,n.kt)("strong",{parentName:"td"},"GP9")),(0,n.kt)("td",{parentName:"tr",align:"left"},"GPIO9"),(0,n.kt)("td",{parentName:"tr",align:"right"},"io")),(0,n.kt)("tr",{parentName:"tbody"},(0,n.kt)("td",{parentName:"tr",align:"left"},(0,n.kt)("strong",{parentName:"td"},"led.pin")),(0,n.kt)("td",{parentName:"tr",align:"left"},"GPIO25"),(0,n.kt)("td",{parentName:"tr",align:"right"},"led.pin,  wifi")))),(0,n.kt)("h2",{id:"devicescript-import"},"DeviceScript import"),(0,n.kt)("p",null,"You must add this import statement to load\nthe pinout configuration for this device."),(0,n.kt)("p",null,"In ",(0,n.kt)("a",{parentName:"p",href:"/getting-started/vscode"},"Visual Studio Code"),",\nclick the ",(0,n.kt)("strong",{parentName:"p"},"wand"),' icon on the file menu and\nselect "Raspberry Pi Pico W".'),(0,n.kt)("pre",null,(0,n.kt)("code",{parentName:"pre",className:"language-ts"},'import { pins, board } from "@dsboard/pico_w"\n')),(0,n.kt)("p",null),(0,n.kt)("h2",{id:"firmware-update"},"Firmware update"),(0,n.kt)("p",null,"In Visual Studio Code,\nselect ",(0,n.kt)("strong",{parentName:"p"},"DeviceScript: Flash Firmware...")," from the command palette."),(0,n.kt)("p",null,"Run this ",(0,n.kt)("a",{parentName:"p",href:"/api/cli"},"command line")," command and follow the instructions."),(0,n.kt)("pre",null,(0,n.kt)("code",{parentName:"pre",className:"language-bash"},"devicescript flash --board pico_w\n")),(0,n.kt)("ul",null,(0,n.kt)("li",{parentName:"ul"},(0,n.kt)("a",{parentName:"li",href:"https://github.com/microsoft/devicescript-pico/releases/latest/download/devicescript-rp2040w-pico_w.uf2"},"Firmware"))),(0,n.kt)("h2",{id:"configuration"},"Configuration"),(0,n.kt)("pre",null,(0,n.kt)("code",{parentName:"pre",className:"language-json",metastring:'title="pico_w.json"',title:'"pico_w.json"'},'{\n    "$schema": "https://raw.githubusercontent.com/microsoft/devicescript-pico/main/boards/rp2040deviceconfig.schema.json",\n    "id": "pico_w",\n    "devName": "Raspberry Pi Pico W",\n    "productId": "0x3a513204",\n    "$description": "RP2040 board from Raspberry Pi with a WiFi chip.",\n    "archId": "rp2040w",\n    "url": "https://www.raspberrypi.com/documentation/microcontrollers/raspberry-pi-pico.html",\n    "led": {\n        "#": "type=100 - special handling for Pico LED",\n        "pin": 25,\n        "type": 100\n    },\n    "pins": {\n        "GP0": 0,\n        "GP1": 1,\n        "GP10": 10,\n        "GP11": 11,\n        "GP12": 12,\n        "GP13": 13,\n        "GP14": 14,\n        "GP15": 15,\n        "GP16": 16,\n        "GP17": 17,\n        "GP18": 18,\n        "GP19": 19,\n        "GP2": 2,\n        "GP20": 20,\n        "GP21": 21,\n        "GP22": 22,\n        "GP26": 26,\n        "GP27": 27,\n        "GP28": 28,\n        "GP3": 3,\n        "GP4": 4,\n        "GP5": 5,\n        "GP6": 6,\n        "GP7": 7,\n        "GP8": 8,\n        "GP9": 9\n    }\n}\n')))}c.isMDXComponent=!0}}]);
// demo/shell/vendor/rp2040js.mjs: rp2040js 1.4.0, the Raspberry Pi Pico
// (RP2040) emulator by Uri Shaked and Wokwi, bundled into ONE ES module for
// the browser. Used by demo/shell/pico.mjs, which runs the router firmware of
// rig/pico/firmware/ on the HARDWARE tab of /kit/.
//
//   package   rp2040js 1.4.0 from npm (sha512-knEMw0SRP9JPVLvhhYB3rjP4gLQhcWs9UOXKvxFU9Rn5eWvmlPzObMhEjfeLZ6H8FGepd6ZtMAYzGEtCaB9qYg==),
//             the same version rig/pico/sim/package.json pins
//   source    https://github.com/wokwi/rp2040js
//   licence   MIT, Copyright (c) 2021 Uri Shaked. The full text is
//             LICENSE-rp2040js beside this file.
//
// HOW IT WAS MADE, pure JavaScript and wasm only (no native binary runs on
// this machine): in a scratch directory,
//   npm install esbuild-wasm@0.24.0 rp2040js@1.4.0
//   npx esbuild entry.mjs --bundle --format=esm --target=es2020 \
//     --legal-comments=none --minify-syntax --outfile=out.mjs
// with entry.mjs exporting only what pico.mjs reads:
//   RP2040            from dist/esm/rp2040.js
//   SimulationClock   from dist/esm/clock/simulation-clock.js
//   I2CMode           from dist/esm/peripherals/i2c.js
//   ConsoleLogger, LogLevel from dist/esm/utils/logging.js
// So the GDB server (node:net), USB CDC and the Simulator wrapper are left out.
// The USB controller is still inside, because rp2040.js constructs it.
//
// The licence, in full, as the MIT terms ask:
//
// The MIT License (MIT)
//
// Copyright (c) 2021 Uri Shaked
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.
//
// out.mjs sha256 70dc790916571a53c0ab93063a7344e9979513e6c4456668bbb76432105484c0, the bytes below this header unchanged.
// node_modules/rp2040js/dist/esm/clock/simulation-clock.js
var ClockAlarm = class {
  constructor(clock, callback) {
    this.clock = clock, this.callback = callback, this.next = null, this.nanos = 0, this.scheduled = !1;
  }
  schedule(deltaNanos) {
    this.scheduled && this.cancel(), this.clock.linkAlarm(deltaNanos, this);
  }
  cancel() {
    this.clock.unlinkAlarm(this), this.scheduled = !1;
  }
}, SimulationClock = class {
  constructor(frequency = 125e6) {
    this.frequency = frequency, this.nextAlarm = null, this.nanosCounter = 0;
  }
  get nanos() {
    return this.nanosCounter;
  }
  get micros() {
    return this.nanos / 1e3;
  }
  createAlarm(callback) {
    return new ClockAlarm(this, callback);
  }
  linkAlarm(nanos, alarm) {
    alarm.nanos = this.nanos + nanos;
    let alarmListItem = this.nextAlarm, lastItem = null;
    for (; alarmListItem && alarmListItem.nanos < alarm.nanos; )
      lastItem = alarmListItem, alarmListItem = alarmListItem.next;
    return lastItem ? (lastItem.next = alarm, alarm.next = alarmListItem) : (this.nextAlarm = alarm, alarm.next = alarmListItem), alarm.scheduled = !0, alarm;
  }
  unlinkAlarm(alarm) {
    let alarmListItem = this.nextAlarm;
    if (!alarmListItem)
      return !1;
    let lastItem = null;
    for (; alarmListItem; ) {
      if (alarmListItem === alarm)
        return lastItem ? lastItem.next = alarmListItem.next : this.nextAlarm = alarmListItem.next, !0;
      lastItem = alarmListItem, alarmListItem = alarmListItem.next;
    }
    return !1;
  }
  tick(deltaNanos) {
    let targetNanos = this.nanosCounter + deltaNanos, alarm = this.nextAlarm;
    for (; alarm && alarm.nanos <= targetNanos; )
      this.nextAlarm = alarm.next, this.nanosCounter = alarm.nanos, alarm.callback(), alarm = this.nextAlarm;
    this.nanosCounter = targetNanos;
  }
  get nanosToNextAlarm() {
    return this.nextAlarm ? this.nextAlarm.nanos - this.nanos : 0;
  }
};

// node_modules/rp2040js/dist/esm/irq.js
var IRQ;
(function(IRQ3) {
  IRQ3[IRQ3.TIMER_0 = 0] = "TIMER_0", IRQ3[IRQ3.TIMER_1 = 1] = "TIMER_1", IRQ3[IRQ3.TIMER_2 = 2] = "TIMER_2", IRQ3[IRQ3.TIMER_3 = 3] = "TIMER_3", IRQ3[IRQ3.PWM_WRAP = 4] = "PWM_WRAP", IRQ3[IRQ3.USBCTRL = 5] = "USBCTRL", IRQ3[IRQ3.XIP = 6] = "XIP", IRQ3[IRQ3.PIO0_IRQ0 = 7] = "PIO0_IRQ0", IRQ3[IRQ3.PIO0_IRQ1 = 8] = "PIO0_IRQ1", IRQ3[IRQ3.PIO1_IRQ0 = 9] = "PIO1_IRQ0", IRQ3[IRQ3.PIO1_IRQ1 = 10] = "PIO1_IRQ1", IRQ3[IRQ3.DMA_IRQ0 = 11] = "DMA_IRQ0", IRQ3[IRQ3.DMA_IRQ1 = 12] = "DMA_IRQ1", IRQ3[IRQ3.IO_BANK0 = 13] = "IO_BANK0", IRQ3[IRQ3.IO_QSPI = 14] = "IO_QSPI", IRQ3[IRQ3.SIO_PROC0 = 15] = "SIO_PROC0", IRQ3[IRQ3.SIO_PROC1 = 16] = "SIO_PROC1", IRQ3[IRQ3.CLOCKS = 17] = "CLOCKS", IRQ3[IRQ3.SPI0 = 18] = "SPI0", IRQ3[IRQ3.SPI1 = 19] = "SPI1", IRQ3[IRQ3.UART0 = 20] = "UART0", IRQ3[IRQ3.UART1 = 21] = "UART1", IRQ3[IRQ3.ADC_FIFO = 22] = "ADC_FIFO", IRQ3[IRQ3.I2C0 = 23] = "I2C0", IRQ3[IRQ3.I2C1 = 24] = "I2C1", IRQ3[IRQ3.RTC = 25] = "RTC";
})(IRQ || (IRQ = {}));
var MAX_HARDWARE_IRQ = IRQ.RTC;

// node_modules/rp2040js/dist/esm/cortex-m0-core.js
var EXC_RESET = 1, EXC_NMI = 2, EXC_HARDFAULT = 3, EXC_SVCALL = 11, EXC_PENDSV = 14, EXC_SYSTICK = 15, SYSM_APSR = 0;
var SYSM_XPSR = 3, SYSM_IPSR = 5;
var SYSM_MSP = 8, SYSM_PSP = 9, SYSM_PRIMASK = 16, SYSM_CONTROL = 20, LOWEST_PRIORITY = 4, ExecutionMode;
(function(ExecutionMode2) {
  ExecutionMode2[ExecutionMode2.Mode_Thread = 0] = "Mode_Thread", ExecutionMode2[ExecutionMode2.Mode_Handler = 1] = "Mode_Handler";
})(ExecutionMode || (ExecutionMode = {}));
function signExtend8(value) {
  return value << 24 >> 24;
}
function signExtend16(value) {
  return value << 16 >> 16;
}
var spRegister = 13, pcRegister = 15, StackPointerBank;
(function(StackPointerBank2) {
  StackPointerBank2[StackPointerBank2.SPmain = 0] = "SPmain", StackPointerBank2[StackPointerBank2.SPprocess = 1] = "SPprocess";
})(StackPointerBank || (StackPointerBank = {}));
var LOG_NAME = "CortexM0Core", CortexM0Core = class {
  constructor(rp2040) {
    this.rp2040 = rp2040, this.registers = new Uint32Array(16), this.bankedSP = 0, this.cycles = 0, this.eventRegistered = !1, this.waiting = !1, this.N = !1, this.C = !1, this.Z = !1, this.V = !1, this.breakRewind = 0, this.PM = !1, this.SPSEL = StackPointerBank.SPmain, this.nPRIV = !1, this.currentMode = ExecutionMode.Mode_Thread, this.IPSR = 0, this.interruptNMIMask = 0, this.pendingInterrupts = 0, this.enabledInterrupts = 0, this.interruptPriorities = [4294967295, 0, 0, 0], this.pendingNMI = !1, this.pendingPendSV = !1, this.pendingSVCall = !1, this.pendingSystick = !1, this.interruptsUpdated = !1, this.VTOR = 0, this.SHPR2 = 0, this.SHPR3 = 0, this.blTaken = (core, blx) => {
    }, this.SP = 4294967292, this.bankedSP = 4294967292;
  }
  get logger() {
    return this.rp2040.logger;
  }
  reset() {
    this.SP = this.rp2040.readUint32(this.VTOR), this.PC = this.rp2040.readUint32(this.VTOR + 4) & 4294967294, this.cycles = 0;
  }
  get SP() {
    return this.registers[13];
  }
  set SP(value) {
    this.registers[13] = value & -4;
  }
  get LR() {
    return this.registers[14];
  }
  set LR(value) {
    this.registers[14] = value;
  }
  get PC() {
    return this.registers[15];
  }
  set PC(value) {
    this.registers[15] = value;
  }
  get APSR() {
    return (this.N ? 2147483648 : 0) | (this.Z ? 1073741824 : 0) | (this.C ? 536870912 : 0) | (this.V ? 268435456 : 0);
  }
  set APSR(value) {
    this.N = !!(value & 2147483648), this.Z = !!(value & 1073741824), this.C = !!(value & 536870912), this.V = !!(value & 268435456);
  }
  get xPSR() {
    return this.APSR | this.IPSR | 1 << 24;
  }
  set xPSR(value) {
    this.APSR = value, this.IPSR = value & 63;
  }
  checkCondition(cond) {
    let result = !1;
    switch (cond >> 1) {
      case 0:
        result = this.Z;
        break;
      case 1:
        result = this.C;
        break;
      case 2:
        result = this.N;
        break;
      case 3:
        result = this.V;
        break;
      case 4:
        result = this.C && !this.Z;
        break;
      case 5:
        result = this.N === this.V;
        break;
      case 6:
        result = this.N === this.V && !this.Z;
        break;
      case 7:
        result = !0;
        break;
    }
    return cond & 1 && cond != 15 ? !result : result;
  }
  readUint32(address) {
    return this.rp2040.readUint32(address);
  }
  readUint16(address) {
    return this.rp2040.readUint16(address);
  }
  readUint8(address) {
    return this.rp2040.readUint8(address);
  }
  writeUint32(address, value) {
    this.rp2040.writeUint32(address, value);
  }
  writeUint16(address, value) {
    this.rp2040.writeUint16(address, value);
  }
  writeUint8(address, value) {
    this.rp2040.writeUint8(address, value);
  }
  switchStack(stack) {
    if (this.SPSEL !== stack) {
      let temp = this.SP;
      this.SP = this.bankedSP, this.bankedSP = temp, this.SPSEL = stack;
    }
  }
  get SPprocess() {
    return this.SPSEL === StackPointerBank.SPprocess ? this.SP : this.bankedSP;
  }
  set SPprocess(value) {
    this.SPSEL === StackPointerBank.SPprocess ? this.SP = value : this.bankedSP = value >>> 0;
  }
  get SPmain() {
    return this.SPSEL === StackPointerBank.SPmain ? this.SP : this.bankedSP;
  }
  set SPmain(value) {
    this.SPSEL === StackPointerBank.SPmain ? this.SP = value : this.bankedSP = value >>> 0;
  }
  exceptionEntry(exceptionNumber) {
    let framePtr = 0, framePtrAlign = 0;
    this.SPSEL && this.currentMode === ExecutionMode.Mode_Thread ? (framePtrAlign = this.SPprocess & 4 ? 1 : 0, this.SPprocess = this.SPprocess - 32 & -5, framePtr = this.SPprocess) : (framePtrAlign = this.SPmain & 4 ? 1 : 0, this.SPmain = this.SPmain - 32 & -5, framePtr = this.SPmain), this.writeUint32(framePtr, this.registers[0]), this.writeUint32(framePtr + 4, this.registers[1]), this.writeUint32(framePtr + 8, this.registers[2]), this.writeUint32(framePtr + 12, this.registers[3]), this.writeUint32(framePtr + 16, this.registers[12]), this.writeUint32(framePtr + 20, this.LR), this.writeUint32(framePtr + 24, this.PC & -2), this.writeUint32(framePtr + 28, this.xPSR & -513 | framePtrAlign << 9), this.currentMode == ExecutionMode.Mode_Handler ? this.LR = 4294967281 : this.SPSEL ? this.LR = 4294967293 : this.LR = 4294967289, this.currentMode = ExecutionMode.Mode_Handler, this.IPSR = exceptionNumber, this.switchStack(StackPointerBank.SPmain), this.eventRegistered = !0;
    let vectorTable = this.VTOR;
    this.PC = this.readUint32(vectorTable + 4 * exceptionNumber);
  }
  exceptionReturn(excReturn) {
    let framePtr = this.SPmain;
    switch (excReturn & 15) {
      case 1:
        this.currentMode = ExecutionMode.Mode_Handler, this.switchStack(StackPointerBank.SPmain);
        break;
      case 9:
        this.currentMode = ExecutionMode.Mode_Thread, this.switchStack(StackPointerBank.SPmain);
        break;
      case 13:
        framePtr = this.SPprocess, this.currentMode = ExecutionMode.Mode_Thread, this.switchStack(StackPointerBank.SPprocess);
        break;
    }
    this.registers[0] = this.readUint32(framePtr), this.registers[1] = this.readUint32(framePtr + 4), this.registers[2] = this.readUint32(framePtr + 8), this.registers[3] = this.readUint32(framePtr + 12), this.registers[12] = this.readUint32(framePtr + 16), this.LR = this.readUint32(framePtr + 20), this.PC = this.readUint32(framePtr + 24);
    let psr = this.readUint32(framePtr + 28), framePtrAlign = psr & 512 ? 4 : 0;
    switch (excReturn & 15) {
      case 1:
        this.SPmain = this.SPmain + 32 | framePtrAlign;
        break;
      case 9:
        this.SPmain = this.SPmain + 32 | framePtrAlign;
        break;
      case 13:
        this.SPprocess = this.SPprocess + 32 | framePtrAlign;
        break;
    }
    this.APSR = psr & 4026531840;
    let forceThread = this.currentMode == ExecutionMode.Mode_Thread && this.nPRIV;
    this.IPSR = forceThread ? 0 : psr & 63, this.interruptsUpdated = !0, this.eventRegistered = !0;
  }
  get pendSVPriority() {
    return this.SHPR3 >> 22 & 3;
  }
  get svCallPriority() {
    return this.SHPR2 >>> 30;
  }
  get systickPriority() {
    return this.SHPR3 >>> 30;
  }
  exceptionPriority(n) {
    switch (n) {
      case EXC_RESET:
        return -3;
      case EXC_NMI:
        return -2;
      case EXC_HARDFAULT:
        return -1;
      case EXC_SVCALL:
        return this.svCallPriority;
      case EXC_PENDSV:
        return this.pendSVPriority;
      case EXC_SYSTICK:
        return this.systickPriority;
      default: {
        if (n < 16)
          return LOWEST_PRIORITY;
        let intNum = n - 16;
        for (let priority = 0; priority < 4; priority++)
          if (this.interruptPriorities[priority] & 1 << intNum)
            return priority;
        return LOWEST_PRIORITY;
      }
    }
  }
  get vectPending() {
    if (this.pendingNMI)
      return EXC_NMI;
    let { svCallPriority, systickPriority, pendSVPriority, pendingInterrupts } = this;
    for (let priority = 0; priority < LOWEST_PRIORITY; priority++) {
      let levelInterrupts = pendingInterrupts & this.interruptPriorities[priority];
      if (this.pendingSVCall && priority === svCallPriority)
        return EXC_SVCALL;
      if (this.pendingPendSV && priority === pendSVPriority)
        return EXC_PENDSV;
      if (this.pendingSystick && priority === systickPriority)
        return EXC_SYSTICK;
      if (levelInterrupts) {
        for (let interruptNumber = 0; interruptNumber < 32; interruptNumber++)
          if (levelInterrupts & 1 << interruptNumber)
            return 16 + interruptNumber;
      }
    }
    return 0;
  }
  setInterrupt(irq, value) {
    let irqBit = 1 << irq;
    value && !(this.pendingInterrupts & irqBit) ? (this.pendingInterrupts |= irqBit, this.interruptsUpdated = !0, this.waiting && this.checkForInterrupts() && (this.waiting = !1)) : value || (this.pendingInterrupts &= ~irqBit);
  }
  checkForInterrupts() {
    let currentPriority = this.waiting ? this.PM ? this.exceptionPriority(this.IPSR) : LOWEST_PRIORITY : Math.min(this.exceptionPriority(this.IPSR), this.PM ? 0 : LOWEST_PRIORITY), interruptSet = this.pendingInterrupts & this.enabledInterrupts, { svCallPriority, systickPriority, pendSVPriority } = this;
    if (this.pendingNMI)
      return this.pendingNMI = !1, this.exceptionEntry(EXC_NMI), !0;
    for (let priority = 0; priority < currentPriority; priority++) {
      let levelInterrupts = interruptSet & this.interruptPriorities[priority];
      if (this.pendingSVCall && priority === svCallPriority)
        return this.pendingSVCall = !1, this.exceptionEntry(EXC_SVCALL), !0;
      if (this.pendingPendSV && priority === pendSVPriority)
        return this.pendingPendSV = !1, this.exceptionEntry(EXC_PENDSV), !0;
      if (this.pendingSystick && priority === systickPriority)
        return this.pendingSystick = !1, this.exceptionEntry(EXC_SYSTICK), !0;
      if (levelInterrupts) {
        for (let interruptNumber = 0; interruptNumber < 32; interruptNumber++)
          if (levelInterrupts & 1 << interruptNumber)
            return interruptNumber > MAX_HARDWARE_IRQ && (this.pendingInterrupts &= ~(1 << interruptNumber)), this.exceptionEntry(16 + interruptNumber), !0;
      }
    }
    return this.interruptsUpdated = !1, !1;
  }
  readSpecialRegister(sysm) {
    switch (sysm) {
      case SYSM_APSR:
        return this.APSR;
      case SYSM_XPSR:
        return this.xPSR;
      case SYSM_IPSR:
        return this.IPSR;
      case SYSM_PRIMASK:
        return this.PM ? 1 : 0;
      case SYSM_MSP:
        return this.SPmain;
      case SYSM_PSP:
        return this.SPprocess;
      case SYSM_CONTROL:
        return (this.SPSEL === StackPointerBank.SPprocess ? 2 : 0) | (this.nPRIV ? 1 : 0);
      default:
        return this.logger.warn(LOG_NAME, `MRS with unimplemented SYSm value: ${sysm}`), 0;
    }
  }
  writeSpecialRegister(sysm, value) {
    switch (sysm) {
      case SYSM_APSR:
        this.APSR = value;
        break;
      case SYSM_XPSR:
        this.xPSR = value;
        break;
      case SYSM_IPSR:
        this.IPSR = value;
        break;
      case SYSM_PRIMASK:
        this.PM = !!(value & 1), this.interruptsUpdated = !0;
        break;
      case SYSM_MSP:
        this.SPmain = value;
        break;
      case SYSM_PSP:
        this.SPprocess = value;
        break;
      case SYSM_CONTROL:
        this.nPRIV = !!(value & 1), this.currentMode === ExecutionMode.Mode_Thread && this.switchStack(value & 2 ? StackPointerBank.SPprocess : StackPointerBank.SPmain);
        break;
      default:
        return this.logger.warn(LOG_NAME, `MRS with unimplemented SYSm value: ${sysm}`), 0;
    }
  }
  BXWritePC(address) {
    this.currentMode == ExecutionMode.Mode_Handler && address >>> 28 == 15 ? this.exceptionReturn(address & 268435455) : this.PC = address & -2;
  }
  substractUpdateFlags(minuend, subtrahend) {
    let result = minuend - subtrahend;
    return this.N = !!(result & 2147483648), this.Z = (result & 4294967295) === 0, this.C = minuend >= subtrahend, this.V = !!(result & 2147483648) && !(minuend & 2147483648) && !!(subtrahend & 2147483648) || !(result & 2147483648) && !!(minuend & 2147483648) && !(subtrahend & 2147483648), result;
  }
  addUpdateFlags(addend1, addend2) {
    let unsignedSum = addend1 + addend2 >>> 0, signedSum = (addend1 | 0) + (addend2 | 0), result = addend1 + addend2;
    return this.N = !!(result & 2147483648), this.Z = (result & 4294967295) === 0, this.C = result !== unsignedSum, this.V = (result | 0) !== signedSum, result & 4294967295;
  }
  cyclesIO(addr, write = !1) {
    return addr = addr >>> 0, addr >= SIO_START_ADDRESS && addr < SIO_START_ADDRESS + 268435456 ? 0 : addr >= APB_START_ADDRESS && addr < APB_START_ADDRESS + 268435456 ? write ? 4 : 3 : 1;
  }
  executeInstruction() {
    this.interruptsUpdated && this.checkForInterrupts() && (this.waiting = !1);
    let opcodePC = this.PC & -2, opcode = this.readUint16(opcodePC), opcode2 = opcode >> 12 === 15 || opcode >> 11 === 29 ? this.readUint16(opcodePC + 2) : 0;
    this.PC += 2;
    let deltaCycles = 1;
    if (opcode >> 6 === 261) {
      let Rm = opcode >> 3 & 7, Rdn = opcode & 7;
      this.registers[Rdn] = this.addUpdateFlags(this.registers[Rm], this.registers[Rdn] + (this.C ? 1 : 0));
    } else if (opcode >> 11 === 21) {
      let imm8 = opcode & 255, Rd = opcode >> 8 & 7;
      this.registers[Rd] = this.SP + (imm8 << 2);
    } else if (opcode >> 7 === 352) {
      let imm32 = (opcode & 127) << 2;
      this.SP += imm32;
    } else if (opcode >> 9 === 14) {
      let imm3 = opcode >> 6 & 7, Rn = opcode >> 3 & 7, Rd = opcode & 7;
      this.registers[Rd] = this.addUpdateFlags(this.registers[Rn], imm3);
    } else if (opcode >> 11 === 6) {
      let imm8 = opcode & 255, Rdn = opcode >> 8 & 7;
      this.registers[Rdn] = this.addUpdateFlags(this.registers[Rdn], imm8);
    } else if (opcode >> 9 === 12) {
      let Rm = opcode >> 6 & 7, Rn = opcode >> 3 & 7, Rd = opcode & 7;
      this.registers[Rd] = this.addUpdateFlags(this.registers[Rn], this.registers[Rm]);
    } else if (opcode >> 8 === 68) {
      let Rm = opcode >> 3 & 15, Rdn = (opcode & 128) >> 4 | opcode & 7, leftValue = Rdn === pcRegister ? this.PC + 2 : this.registers[Rdn], rightValue = Rm === pcRegister ? this.PC + 2 : this.registers[Rm], result = leftValue + rightValue;
      Rdn !== spRegister && Rdn !== pcRegister ? this.registers[Rdn] = result : Rdn === pcRegister ? (this.registers[Rdn] = result & -2, deltaCycles++) : Rdn === spRegister && (this.registers[Rdn] = result & -4);
    } else if (opcode >> 11 === 20) {
      let imm8 = opcode & 255, Rd = opcode >> 8 & 7;
      this.registers[Rd] = (opcodePC & 4294967292) + 4 + (imm8 << 2);
    } else if (opcode >> 6 === 256) {
      let Rm = opcode >> 3 & 7, Rdn = opcode & 7, result = this.registers[Rdn] & this.registers[Rm];
      this.registers[Rdn] = result, this.N = !!(result & 2147483648), this.Z = (result & 4294967295) === 0;
    } else if (opcode >> 11 === 2) {
      let imm5 = opcode >> 6 & 31, Rm = opcode >> 3 & 7, Rd = opcode & 7, input = this.registers[Rm], shiftN = imm5 || 32, result = shiftN < 32 ? input >> shiftN : (input & 2147483648) >> 31;
      this.registers[Rd] = result, this.N = !!(result & 2147483648), this.Z = (result & 4294967295) === 0, this.C = !!(input & 1 << shiftN - 1);
    } else if (opcode >> 6 === 260) {
      let Rm = opcode >> 3 & 7, Rdn = opcode & 7, input = this.registers[Rdn], shiftN = (this.registers[Rm] & 255) < 32 ? this.registers[Rm] & 255 : 32, result = shiftN < 32 ? input >> shiftN : (input & 2147483648) >> 31;
      this.registers[Rdn] = result, this.N = !!(result & 2147483648), this.Z = (result & 4294967295) === 0, this.C = !!(input & 1 << shiftN - 1);
    } else if (opcode >> 12 === 13 && (opcode >> 9 & 7) !== 7) {
      let imm8 = (opcode & 255) << 1, cond = opcode >> 8 & 15;
      imm8 & 256 && (imm8 = (imm8 & 511) - 512), this.checkCondition(cond) && (this.PC += imm8 + 2, deltaCycles++);
    } else if (opcode >> 11 === 28) {
      let imm11 = (opcode & 2047) << 1;
      imm11 & 2048 && (imm11 = (imm11 & 2047) - 2048), this.PC += imm11 + 2, deltaCycles++;
    } else if (opcode >> 6 === 270) {
      let Rm = opcode >> 3 & 7, Rdn = opcode & 7, result = this.registers[Rdn] &= ~this.registers[Rm];
      this.N = !!(result & 2147483648), this.Z = result === 0;
    } else if (opcode >> 8 === 190) {
      let imm8 = opcode & 255;
      this.breakRewind = 2, this.rp2040.onBreak(imm8);
    } else if (opcode >> 11 === 30 && opcode2 >> 14 === 3 && (opcode2 >> 12 & 1) == 1) {
      let imm11 = opcode2 & 2047, J2 = opcode2 >> 11 & 1, J1 = opcode2 >> 13 & 1, imm10 = opcode & 1023, S = opcode >> 10 & 1, I1 = 1 - (S ^ J1), I2 = 1 - (S ^ J2), imm32 = (S ? 255 : 0) << 24 | (I1 << 23 | I2 << 22 | imm10 << 12 | imm11 << 1);
      this.LR = this.PC + 2 | 1, this.PC += 2 + imm32, deltaCycles += 2, this.blTaken(this, !1);
    } else if (opcode >> 7 === 143 && !(opcode & 7)) {
      let Rm = opcode >> 3 & 15;
      this.LR = this.PC | 1, this.PC = this.registers[Rm] & -2, deltaCycles++, this.blTaken(this, !0);
    } else if (opcode >> 7 === 142 && !(opcode & 7)) {
      let Rm = opcode >> 3 & 15;
      this.BXWritePC(this.registers[Rm]), deltaCycles++;
    } else if (opcode >> 6 === 267) {
      let Rm = opcode >> 3 & 7, Rn = opcode & 7;
      this.addUpdateFlags(this.registers[Rn], this.registers[Rm]);
    } else if (opcode >> 11 === 5) {
      let Rn = opcode >> 8 & 7, imm8 = opcode & 255;
      this.substractUpdateFlags(this.registers[Rn], imm8);
    } else if (opcode >> 6 === 266) {
      let Rm = opcode >> 3 & 7, Rn = opcode & 7;
      this.substractUpdateFlags(this.registers[Rn], this.registers[Rm]);
    } else if (opcode >> 8 === 69) {
      let Rm = opcode >> 3 & 15, Rn = opcode >> 4 & 8 | opcode & 7;
      this.substractUpdateFlags(this.registers[Rn], this.registers[Rm]);
    } else if (opcode === 46706)
      this.PM = !0;
    else if (opcode === 46690)
      this.PM = !1, this.interruptsUpdated = !0;
    else if (opcode === 62399 && (opcode2 & 65520) === 36688)
      this.PC += 2, deltaCycles += 2;
    else if (opcode === 62399 && (opcode2 & 65520) === 36672)
      this.PC += 2, deltaCycles += 2;
    else if (opcode >> 6 === 257) {
      let Rm = opcode >> 3 & 7, Rdn = opcode & 7, result = this.registers[Rm] ^ this.registers[Rdn];
      this.registers[Rdn] = result, this.N = !!(result & 2147483648), this.Z = result === 0;
    } else if (opcode === 62399 && (opcode2 & 65520) === 36704)
      this.PC += 2, deltaCycles += 2;
    else if (opcode >> 11 === 25) {
      let Rn = opcode >> 8 & 7, registers = opcode & 255, address = this.registers[Rn];
      for (let i = 0; i < 8; i++)
        registers & 1 << i && (this.registers[i] = this.readUint32(address), address += 4, deltaCycles++);
      registers & 1 << Rn || (this.registers[Rn] = address);
    } else if (opcode >> 11 === 13) {
      let imm5 = (opcode >> 6 & 31) << 2, Rn = opcode >> 3 & 7, Rt = opcode & 7, addr = this.registers[Rn] + imm5;
      deltaCycles += this.cyclesIO(addr), this.registers[Rt] = this.readUint32(addr);
    } else if (opcode >> 11 === 19) {
      let Rt = opcode >> 8 & 7, imm8 = opcode & 255, addr = this.SP + (imm8 << 2);
      deltaCycles += this.cyclesIO(addr), this.registers[Rt] = this.readUint32(addr);
    } else if (opcode >> 11 === 9) {
      let imm8 = (opcode & 255) << 2, Rt = opcode >> 8 & 7, addr = (this.PC + 2 & 4294967292) + imm8;
      deltaCycles += this.cyclesIO(addr), this.registers[Rt] = this.readUint32(addr);
    } else if (opcode >> 9 === 44) {
      let Rm = opcode >> 6 & 7, Rn = opcode >> 3 & 7, Rt = opcode & 7, addr = this.registers[Rm] + this.registers[Rn];
      deltaCycles += this.cyclesIO(addr), this.registers[Rt] = this.readUint32(addr);
    } else if (opcode >> 11 === 15) {
      let imm5 = opcode >> 6 & 31, Rn = opcode >> 3 & 7, Rt = opcode & 7, addr = this.registers[Rn] + imm5;
      deltaCycles += this.cyclesIO(addr), this.registers[Rt] = this.readUint8(addr);
    } else if (opcode >> 9 === 46) {
      let Rm = opcode >> 6 & 7, Rn = opcode >> 3 & 7, Rt = opcode & 7, addr = this.registers[Rm] + this.registers[Rn];
      deltaCycles += this.cyclesIO(addr), this.registers[Rt] = this.readUint8(addr);
    } else if (opcode >> 11 === 17) {
      let imm5 = opcode >> 6 & 31, Rn = opcode >> 3 & 7, Rt = opcode & 7, addr = this.registers[Rn] + (imm5 << 1);
      deltaCycles += this.cyclesIO(addr), this.registers[Rt] = this.readUint16(addr);
    } else if (opcode >> 9 === 45) {
      let Rm = opcode >> 6 & 7, Rn = opcode >> 3 & 7, Rt = opcode & 7, addr = this.registers[Rm] + this.registers[Rn];
      deltaCycles += this.cyclesIO(addr), this.registers[Rt] = this.readUint16(addr);
    } else if (opcode >> 9 === 43) {
      let Rm = opcode >> 6 & 7, Rn = opcode >> 3 & 7, Rt = opcode & 7, addr = this.registers[Rm] + this.registers[Rn];
      deltaCycles += this.cyclesIO(addr), this.registers[Rt] = signExtend8(this.readUint8(addr));
    } else if (opcode >> 9 === 47) {
      let Rm = opcode >> 6 & 7, Rn = opcode >> 3 & 7, Rt = opcode & 7, addr = this.registers[Rm] + this.registers[Rn];
      deltaCycles += this.cyclesIO(addr), this.registers[Rt] = signExtend16(this.readUint16(addr));
    } else if (opcode >> 11) {
      if (opcode >> 6 === 258) {
        let Rm = opcode >> 3 & 7, Rdn = opcode & 7, input = this.registers[Rdn], shiftCount = this.registers[Rm] & 255, result = shiftCount >= 32 ? 0 : input << shiftCount;
        this.registers[Rdn] = result, this.N = !!(result & 2147483648), this.Z = result === 0, this.C = shiftCount ? !!(input & 1 << 32 - shiftCount) : this.C;
      } else if (opcode >> 11 === 1) {
        let imm5 = opcode >> 6 & 31, Rm = opcode >> 3 & 7, Rd = opcode & 7, input = this.registers[Rm], result = imm5 ? input >>> imm5 : 0;
        this.registers[Rd] = result, this.N = !!(result & 2147483648), this.Z = result === 0, this.C = !!(input >>> (imm5 ? imm5 - 1 : 31) & 1);
      } else if (opcode >> 6 === 259) {
        let Rm = opcode >> 3 & 7, Rdn = opcode & 7, shiftAmount = this.registers[Rm] & 255, input = this.registers[Rdn], result = shiftAmount < 32 ? input >>> shiftAmount : 0;
        this.registers[Rdn] = result, this.N = !!(result & 2147483648), this.Z = result === 0, this.C = shiftAmount <= 32 ? !!(input >>> shiftAmount - 1 & 1) : !1;
      } else if (opcode >> 8 === 70) {
        let Rm = opcode >> 3 & 15, Rd = opcode >> 4 & 8 | opcode & 7, value = Rm === pcRegister ? this.PC + 2 : this.registers[Rm];
        Rd === pcRegister ? (deltaCycles++, value &= -2) : Rd === spRegister && (value &= -4), this.registers[Rd] = value;
      } else if (opcode >> 11 === 4) {
        let value = opcode & 255, Rd = opcode >> 8 & 7;
        this.registers[Rd] = value, this.N = !!(value & 2147483648), this.Z = value === 0;
      } else if (opcode === 62447 && opcode2 >> 12 == 8) {
        let SYSm = opcode2 & 255, Rd = opcode2 >> 8 & 15;
        this.registers[Rd] = this.readSpecialRegister(SYSm), this.PC += 2, deltaCycles += 2;
      } else if (opcode >> 4 === 3896 && opcode2 >> 8 == 136) {
        let SYSm = opcode2 & 255, Rn = opcode & 15;
        this.writeSpecialRegister(SYSm, this.registers[Rn]), this.PC += 2, deltaCycles += 2;
      } else if (opcode >> 6 === 269) {
        let Rn = opcode >> 3 & 7, Rdm = opcode & 7, result = Math.imul(this.registers[Rn], this.registers[Rdm]);
        this.registers[Rdm] = result, this.N = !!(result & 2147483648), this.Z = (result & 4294967295) === 0;
      } else if (opcode >> 6 === 271) {
        let Rm = opcode >> 3 & 7, Rd = opcode & 7, result = ~this.registers[Rm];
        this.registers[Rd] = result, this.N = !!(result & 2147483648), this.Z = result === 0;
      } else if (opcode >> 6 === 268) {
        let Rm = opcode >> 3 & 7, Rdn = opcode & 7, result = this.registers[Rdn] | this.registers[Rm];
        this.registers[Rdn] = result, this.N = !!(result & 2147483648), this.Z = (result & 4294967295) === 0;
      } else if (opcode >> 9 === 94) {
        let P = opcode >> 8 & 1, address = this.SP;
        for (let i = 0; i <= 7; i++)
          opcode & 1 << i && (this.registers[i] = this.readUint32(address), address += 4, deltaCycles++);
        P ? (this.SP = address + 4, this.BXWritePC(this.readUint32(address)), deltaCycles += 2) : this.SP = address;
      } else if (opcode >> 9 === 90) {
        let bitCount = 0;
        for (let i = 0; i <= 8; i++)
          opcode & 1 << i && bitCount++;
        let address = this.SP - 4 * bitCount;
        for (let i = 0; i <= 7; i++)
          opcode & 1 << i && (this.writeUint32(address, this.registers[i]), deltaCycles++, address += 4);
        opcode & 256 && this.writeUint32(address, this.registers[14]), this.SP -= 4 * bitCount;
      } else if (opcode >> 6 === 744) {
        let Rm = opcode >> 3 & 7, Rd = opcode & 7, input = this.registers[Rm];
        this.registers[Rd] = (input & 255) << 24 | (input >> 8 & 255) << 16 | (input >> 16 & 255) << 8 | input >> 24 & 255;
      } else if (opcode >> 6 === 745) {
        let Rm = opcode >> 3 & 7, Rd = opcode & 7, input = this.registers[Rm];
        this.registers[Rd] = (input >> 16 & 255) << 24 | (input >> 24 & 255) << 16 | (input & 255) << 8 | input >> 8 & 255;
      } else if (opcode >> 6 === 747) {
        let Rm = opcode >> 3 & 7, Rd = opcode & 7, input = this.registers[Rm];
        this.registers[Rd] = signExtend16((input & 255) << 8 | input >> 8 & 255);
      } else if (opcode >> 6 === 263) {
        let Rm = opcode >> 3 & 7, Rdn = opcode & 7, input = this.registers[Rdn], shift = (this.registers[Rm] & 255) % 32, result = input >>> shift | input << 32 - shift;
        this.registers[Rdn] = result, this.N = !!(result & 2147483648), this.Z = result === 0, this.C = !!(result & 2147483648);
      } else if (opcode >> 6 === 265) {
        let Rn = opcode >> 3 & 7, Rd = opcode & 7;
        this.registers[Rd] = this.substractUpdateFlags(0, this.registers[Rn]);
      } else if (opcode !== 48896)
        if (opcode >> 6 === 262) {
          let Rm = opcode >> 3 & 7, Rdn = opcode & 7;
          this.registers[Rdn] = this.substractUpdateFlags(this.registers[Rdn], this.registers[Rm] + (1 - (this.C ? 1 : 0)));
        } else if (opcode === 48960)
          this.logger.info(LOG_NAME, "SEV");
        else if (opcode >> 11 === 24) {
          let Rn = opcode >> 8 & 7, registers = opcode & 255, address = this.registers[Rn];
          for (let i = 0; i < 8; i++)
            registers & 1 << i && (this.writeUint32(address, this.registers[i]), address += 4, deltaCycles++);
          registers & 1 << Rn || (this.registers[Rn] = address);
        } else if (opcode >> 11 === 12) {
          let imm5 = (opcode >> 6 & 31) << 2, Rn = opcode >> 3 & 7, Rt = opcode & 7, address = this.registers[Rn] + imm5;
          deltaCycles += this.cyclesIO(address, !0), this.writeUint32(address, this.registers[Rt]);
        } else if (opcode >> 11 === 18) {
          let Rt = opcode >> 8 & 7, imm8 = opcode & 255, address = this.SP + (imm8 << 2);
          deltaCycles += this.cyclesIO(address, !0), this.writeUint32(address, this.registers[Rt]);
        } else if (opcode >> 9 === 40) {
          let Rm = opcode >> 6 & 7, Rn = opcode >> 3 & 7, Rt = opcode & 7, address = this.registers[Rm] + this.registers[Rn];
          deltaCycles += this.cyclesIO(address, !0), this.writeUint32(address, this.registers[Rt]);
        } else if (opcode >> 11 === 14) {
          let imm5 = opcode >> 6 & 31, Rn = opcode >> 3 & 7, Rt = opcode & 7, address = this.registers[Rn] + imm5;
          deltaCycles += this.cyclesIO(address, !0), this.writeUint8(address, this.registers[Rt]);
        } else if (opcode >> 9 === 42) {
          let Rm = opcode >> 6 & 7, Rn = opcode >> 3 & 7, Rt = opcode & 7, address = this.registers[Rm] + this.registers[Rn];
          deltaCycles += this.cyclesIO(address, !0), this.writeUint8(address, this.registers[Rt]);
        } else if (opcode >> 11 === 16) {
          let imm5 = (opcode >> 6 & 31) << 1, Rn = opcode >> 3 & 7, Rt = opcode & 7, address = this.registers[Rn] + imm5;
          deltaCycles += this.cyclesIO(address, !0), this.writeUint16(address, this.registers[Rt]);
        } else if (opcode >> 9 === 41) {
          let Rm = opcode >> 6 & 7, Rn = opcode >> 3 & 7, Rt = opcode & 7, address = this.registers[Rm] + this.registers[Rn];
          deltaCycles += this.cyclesIO(address, !0), this.writeUint16(address, this.registers[Rt]);
        } else if (opcode >> 7 === 353) {
          let imm32 = (opcode & 127) << 2;
          this.SP -= imm32;
        } else if (opcode >> 9 === 15) {
          let imm3 = opcode >> 6 & 7, Rn = opcode >> 3 & 7, Rd = opcode & 7;
          this.registers[Rd] = this.substractUpdateFlags(this.registers[Rn], imm3);
        } else if (opcode >> 11 === 7) {
          let imm8 = opcode & 255, Rdn = opcode >> 8 & 7;
          this.registers[Rdn] = this.substractUpdateFlags(this.registers[Rdn], imm8);
        } else if (opcode >> 9 === 13) {
          let Rm = opcode >> 6 & 7, Rn = opcode >> 3 & 7, Rd = opcode & 7;
          this.registers[Rd] = this.substractUpdateFlags(this.registers[Rn], this.registers[Rm]);
        } else if (opcode >> 8 === 223)
          this.pendingSVCall = !0, this.interruptsUpdated = !0;
        else if (opcode >> 6 === 713) {
          let Rm = opcode >> 3 & 7, Rd = opcode & 7;
          this.registers[Rd] = signExtend8(this.registers[Rm]);
        } else if (opcode >> 6 === 712) {
          let Rm = opcode >> 3 & 7, Rd = opcode & 7;
          this.registers[Rd] = signExtend16(this.registers[Rm]);
        } else if (opcode >> 6 == 264) {
          let Rm = opcode >> 3 & 7, Rn = opcode & 7, result = this.registers[Rn] & this.registers[Rm];
          this.N = !!(result & 2147483648), this.Z = result === 0;
        } else if (opcode >> 8 == 222) {
          let imm8 = opcode & 255;
          this.breakRewind = 2, this.rp2040.onBreak(imm8);
        } else if (opcode >> 4 === 3967 && opcode2 >> 12 === 10) {
          let imm4 = opcode & 15, imm12 = opcode2 & 4095;
          this.breakRewind = 4, this.rp2040.onBreak(imm4 << 12 | imm12), this.PC += 2;
        } else if (opcode >> 6 == 715) {
          let Rm = opcode >> 3 & 7, Rd = opcode & 7;
          this.registers[Rd] = this.registers[Rm] & 255;
        } else if (opcode >> 6 == 714) {
          let Rm = opcode >> 3 & 7, Rd = opcode & 7;
          this.registers[Rd] = this.registers[Rm] & 65535;
        } else opcode === 48928 ? (deltaCycles++, this.eventRegistered ? this.eventRegistered = !1 : this.waiting = !0) : opcode === 48944 ? (deltaCycles++, this.waiting = !0) : opcode === 48912 ? this.logger.info(LOG_NAME, "Yield") : (this.logger.warn(LOG_NAME, `Warning: Instruction at ${opcodePC.toString(16)} is not implemented yet!`), this.logger.warn(LOG_NAME, `Opcode: 0x${opcode.toString(16)} (0x${opcode2.toString(16)})`));
    } else {
      let imm5 = opcode >> 6 & 31, Rm = opcode >> 3 & 7, Rd = opcode & 7, input = this.registers[Rm], result = input << imm5;
      this.registers[Rd] = result, this.N = !!(result & 2147483648), this.Z = result === 0, this.C = imm5 ? !!(input & 1 << 32 - imm5) : this.C;
    }
    return this.cycles += deltaCycles, deltaCycles;
  }
};

// node_modules/rp2040js/dist/esm/utils/fifo.js
var FIFO = class {
  constructor(size) {
    this.start = 0, this.used = 0, this.buffer = new Uint32Array(size);
  }
  get size() {
    return this.buffer.length;
  }
  get itemCount() {
    return this.used;
  }
  push(value) {
    let { length } = this.buffer, { start, used } = this;
    this.used < length && (this.buffer[(start + used) % length] = value, this.used++);
  }
  pull() {
    let { start, used } = this, { length } = this.buffer;
    return used ? (this.start = (start + 1) % length, this.used--, this.buffer[start]) : 0;
  }
  peek() {
    return this.used ? this.buffer[this.start] : 0;
  }
  reset() {
    this.used = 0;
  }
  get empty() {
    return this.used == 0;
  }
  get full() {
    return this.used === this.buffer.length;
  }
  get items() {
    let { start, used, buffer } = this, { length } = buffer, result = [];
    for (let i = 0; i < used; i++)
      result[i] = buffer[(start + i) % length];
    return result;
  }
};

// node_modules/rp2040js/dist/esm/peripherals/peripheral.js
function atomicUpdate(currentValue, atomicType, newValue) {
  switch (atomicType) {
    case 1:
      return currentValue ^ newValue;
    case 2:
      return currentValue | newValue;
    case 3:
      return currentValue & ~newValue;
    default:
      return console.warn("Atomic update called with invalid writeType", atomicType), newValue;
  }
}
var BasePeripheral = class {
  constructor(rp2040, name) {
    this.rp2040 = rp2040, this.name = name, this.rawWriteValue = 0;
  }
  readUint32(offset) {
    return this.warn(`Unimplemented peripheral read from 0x${offset.toString(16)}`), offset > 4096 && this.warn("Unimplemented read from peripheral in the atomic operation region"), 4294967295;
  }
  writeUint32(offset, value) {
    this.warn(`Unimplemented peripheral write to 0x${offset.toString(16)}: 0x${value.toString(16)}`);
  }
  writeUint32Atomic(offset, value, atomicType) {
    this.rawWriteValue = value;
    let newValue = atomicType != 0 ? atomicUpdate(this.readUint32(offset), atomicType, value) : value;
    this.writeUint32(offset, newValue);
  }
  debug(msg) {
    this.rp2040.logger.debug(this.name, msg);
  }
  info(msg) {
    this.rp2040.logger.info(this.name, msg);
  }
  warn(msg) {
    this.rp2040.logger.warn(this.name, msg);
  }
  error(msg) {
    this.rp2040.logger.error(this.name, msg);
  }
}, UnimplementedPeripheral = class extends BasePeripheral {
};

// node_modules/rp2040js/dist/esm/peripherals/dma.js
var DREQChannel;
(function(DREQChannel2) {
  DREQChannel2[DREQChannel2.DREQ_PIO0_TX0 = 0] = "DREQ_PIO0_TX0", DREQChannel2[DREQChannel2.DREQ_PIO0_TX1 = 1] = "DREQ_PIO0_TX1", DREQChannel2[DREQChannel2.DREQ_PIO0_TX2 = 2] = "DREQ_PIO0_TX2", DREQChannel2[DREQChannel2.DREQ_PIO0_TX3 = 3] = "DREQ_PIO0_TX3", DREQChannel2[DREQChannel2.DREQ_PIO0_RX0 = 4] = "DREQ_PIO0_RX0", DREQChannel2[DREQChannel2.DREQ_PIO0_RX1 = 5] = "DREQ_PIO0_RX1", DREQChannel2[DREQChannel2.DREQ_PIO0_RX2 = 6] = "DREQ_PIO0_RX2", DREQChannel2[DREQChannel2.DREQ_PIO0_RX3 = 7] = "DREQ_PIO0_RX3", DREQChannel2[DREQChannel2.DREQ_PIO1_TX0 = 8] = "DREQ_PIO1_TX0", DREQChannel2[DREQChannel2.DREQ_PIO1_TX1 = 9] = "DREQ_PIO1_TX1", DREQChannel2[DREQChannel2.DREQ_PIO1_TX2 = 10] = "DREQ_PIO1_TX2", DREQChannel2[DREQChannel2.DREQ_PIO1_TX3 = 11] = "DREQ_PIO1_TX3", DREQChannel2[DREQChannel2.DREQ_PIO1_RX0 = 12] = "DREQ_PIO1_RX0", DREQChannel2[DREQChannel2.DREQ_PIO1_RX1 = 13] = "DREQ_PIO1_RX1", DREQChannel2[DREQChannel2.DREQ_PIO1_RX2 = 14] = "DREQ_PIO1_RX2", DREQChannel2[DREQChannel2.DREQ_PIO1_RX3 = 15] = "DREQ_PIO1_RX3", DREQChannel2[DREQChannel2.DREQ_SPI0_TX = 16] = "DREQ_SPI0_TX", DREQChannel2[DREQChannel2.DREQ_SPI0_RX = 17] = "DREQ_SPI0_RX", DREQChannel2[DREQChannel2.DREQ_SPI1_TX = 18] = "DREQ_SPI1_TX", DREQChannel2[DREQChannel2.DREQ_SPI1_RX = 19] = "DREQ_SPI1_RX", DREQChannel2[DREQChannel2.DREQ_UART0_TX = 20] = "DREQ_UART0_TX", DREQChannel2[DREQChannel2.DREQ_UART0_RX = 21] = "DREQ_UART0_RX", DREQChannel2[DREQChannel2.DREQ_UART1_TX = 22] = "DREQ_UART1_TX", DREQChannel2[DREQChannel2.DREQ_UART1_RX = 23] = "DREQ_UART1_RX", DREQChannel2[DREQChannel2.DREQ_PWM_WRAP0 = 24] = "DREQ_PWM_WRAP0", DREQChannel2[DREQChannel2.DREQ_PWM_WRAP1 = 25] = "DREQ_PWM_WRAP1", DREQChannel2[DREQChannel2.DREQ_PWM_WRAP2 = 26] = "DREQ_PWM_WRAP2", DREQChannel2[DREQChannel2.DREQ_PWM_WRAP3 = 27] = "DREQ_PWM_WRAP3", DREQChannel2[DREQChannel2.DREQ_PWM_WRAP4 = 28] = "DREQ_PWM_WRAP4", DREQChannel2[DREQChannel2.DREQ_PWM_WRAP5 = 29] = "DREQ_PWM_WRAP5", DREQChannel2[DREQChannel2.DREQ_PWM_WRAP6 = 30] = "DREQ_PWM_WRAP6", DREQChannel2[DREQChannel2.DREQ_PWM_WRAP7 = 31] = "DREQ_PWM_WRAP7", DREQChannel2[DREQChannel2.DREQ_I2C0_TX = 32] = "DREQ_I2C0_TX", DREQChannel2[DREQChannel2.DREQ_I2C0_RX = 33] = "DREQ_I2C0_RX", DREQChannel2[DREQChannel2.DREQ_I2C1_TX = 34] = "DREQ_I2C1_TX", DREQChannel2[DREQChannel2.DREQ_I2C1_RX = 35] = "DREQ_I2C1_RX", DREQChannel2[DREQChannel2.DREQ_ADC = 36] = "DREQ_ADC", DREQChannel2[DREQChannel2.DREQ_XIP_STREAM = 37] = "DREQ_XIP_STREAM", DREQChannel2[DREQChannel2.DREQ_XIP_SSITX = 38] = "DREQ_XIP_SSITX", DREQChannel2[DREQChannel2.DREQ_XIP_SSIRX = 39] = "DREQ_XIP_SSIRX", DREQChannel2[DREQChannel2.DREQ_MAX = 40] = "DREQ_MAX";
})(DREQChannel || (DREQChannel = {}));
var TREQ;
(function(TREQ2) {
  TREQ2[TREQ2.Timer0 = 59] = "Timer0", TREQ2[TREQ2.Timer1 = 60] = "Timer1", TREQ2[TREQ2.Timer2 = 61] = "Timer2", TREQ2[TREQ2.Timer3 = 62] = "Timer3", TREQ2[TREQ2.Permanent = 63] = "Permanent";
})(TREQ || (TREQ = {}));
var CHn_READ_ADDR = 0, CHn_WRITE_ADDR = 4, CHn_TRANS_COUNT = 8, CHn_CTRL_TRIG = 12, CHn_AL1_CTRL = 16, CHn_AL1_READ_ADDR = 20, CHn_AL1_WRITE_ADDR = 24, CHn_AL1_TRANS_COUNT_TRIG = 28, CHn_AL2_CTRL = 32, CHn_AL2_TRANS_COUNT = 36, CHn_AL2_READ_ADDR = 40, CHn_AL2_WRITE_ADDR_TRIG = 44, CHn_AL3_CTRL = 48, CHn_AL3_WRITE_ADDR = 52, CHn_AL3_TRANS_COUNT = 56, CHn_AL3_READ_ADDR_TRIG = 60, CHn_DBG_CTDREQ = 2048, CHn_DBG_TCR = 2052, CHANNEL_REGISTERS_SIZE = 12 * 64, CHANNEL_REGISTERS_MASK = 2111, INTR = 1024, INTE0 = 1028, INTF0 = 1032, INTS0 = 1036, INTE1 = 1044, INTF1 = 1048, INTS1 = 1052, TIMER0 = 1056, TIMER1 = 1060, TIMER2 = 1064, TIMER3 = 1068, MULTI_CHAN_TRIGGER = 1072;
var CHAN_ABORT = 1092, N_CHANNELS = 1096, AHB_ERROR = 1 << 31, READ_ERROR = 1 << 30, WRITE_ERROR = 1 << 29, BUSY = 1 << 24, SNIFF_EN = 1 << 23, BSWAP = 1 << 22, IRQ_QUIET = 1 << 21, TREQ_SEL_MASK = 63, TREQ_SEL_SHIFT = 15, CHAIN_TO_MASK = 15, CHAIN_TO_SHIFT = 11, RING_SEL = 1024, RING_SIZE_MASK = 15, RING_SIZE_SHIFT = 6, INCR_WRITE = 32, INCR_READ = 16, DATA_SIZE_MASK = 3, DATA_SIZE_SHIFT = 2;
var EN = 1, CHn_CTRL_TRIG_WRITE_MASK = 16777215, CHn_CTRL_TRIG_WC_MASK = READ_ERROR | WRITE_ERROR, RPDMAChannel = class {
  constructor(dma, rp2040, index) {
    this.dma = dma, this.rp2040 = rp2040, this.index = index, this.ctrl = 0, this.readAddr = 0, this.writeAddr = 0, this.transCount = 0, this.dreqCounter = 0, this.transCountReload = 0, this.treqValue = 0, this.dataSize = 1, this.chainTo = 0, this.ringMask = 0, this.transferFn = () => 0, this.transfer8 = () => {
      let { rp2040: rp20402 } = this;
      rp20402.writeUint8(this.writeAddr, rp20402.readUint8(this.readAddr));
    }, this.transfer16 = () => {
      let { rp2040: rp20402 } = this;
      rp20402.writeUint16(this.writeAddr, rp20402.readUint16(this.readAddr));
    }, this.transferSwap16 = () => {
      let { rp2040: rp20402 } = this, input = rp20402.readUint16(this.readAddr);
      rp20402.writeUint16(this.writeAddr, (input & 255) << 8 | input >> 8);
    }, this.transfer32 = () => {
      let { rp2040: rp20402 } = this;
      rp20402.writeUint32(this.writeAddr, rp20402.readUint32(this.readAddr));
    }, this.transferSwap32 = () => {
      let { rp2040: rp20402 } = this, input = rp20402.readUint32(this.readAddr);
      rp20402.writeUint32(this.writeAddr, (input & 255) << 24 | (input & 65280) << 8 | (input & 16711680) >> 8 | input >> 24 & 255);
    }, this.transfer = () => {
      var _a;
      let { ctrl, dataSize, ringMask } = this;
      this.transferFn(), ctrl & INCR_READ && (ringMask && !(ctrl & RING_SEL) ? this.readAddr = this.readAddr & ~ringMask | this.readAddr + dataSize & ringMask : this.readAddr += dataSize), ctrl & INCR_WRITE && (ringMask && ctrl & RING_SEL ? this.writeAddr = this.writeAddr & ~ringMask | this.writeAddr + dataSize & ringMask : this.writeAddr += dataSize), this.transCount--, this.transCount > 0 ? this.scheduleTransfer() : (this.ctrl &= ~BUSY, this.ctrl & IRQ_QUIET || (this.dma.intRaw |= 1 << this.index, this.dma.checkInterrupts()), this.chainTo !== this.index && ((_a = this.dma.channels[this.chainTo]) === null || _a === void 0 || _a.start()));
    }, this.transferAlarm = rp2040.clock.createAlarm(this.transfer), this.reset();
  }
  start() {
    !(this.ctrl & EN) || this.ctrl & BUSY || (this.ctrl |= BUSY, this.transCount = this.transCountReload, this.transCount && this.scheduleTransfer());
  }
  get treq() {
    return this.treqValue;
  }
  get active() {
    return this.ctrl & EN && this.ctrl & BUSY;
  }
  scheduleTransfer() {
    if (this.dma.dreq[this.treqValue] || this.treqValue === TREQ.Permanent)
      this.transferAlarm.schedule(0);
    else {
      let delay = this.dma.getTimer(this.treqValue);
      delay && this.transferAlarm.schedule(delay * 1e3);
    }
  }
  abort() {
    this.ctrl &= ~BUSY, this.transferAlarm.cancel();
  }
  readUint32(offset) {
    switch (offset) {
      case CHn_READ_ADDR:
      case CHn_AL1_READ_ADDR:
      case CHn_AL2_READ_ADDR:
      case CHn_AL3_READ_ADDR_TRIG:
        return this.readAddr;
      case CHn_WRITE_ADDR:
      case CHn_AL1_WRITE_ADDR:
      case CHn_AL2_WRITE_ADDR_TRIG:
      case CHn_AL3_WRITE_ADDR:
        return this.writeAddr;
      case CHn_TRANS_COUNT:
      case CHn_AL1_TRANS_COUNT_TRIG:
      case CHn_AL2_TRANS_COUNT:
      case CHn_AL3_TRANS_COUNT:
        return this.transCount;
      case CHn_CTRL_TRIG:
      case CHn_AL1_CTRL:
      case CHn_AL2_CTRL:
      case CHn_AL3_CTRL:
        return this.ctrl;
      case CHn_DBG_CTDREQ:
        return this.dreqCounter;
      case CHn_DBG_TCR:
        return this.transCountReload;
    }
    return 0;
  }
  writeUint32(offset, value) {
    switch (offset) {
      case CHn_READ_ADDR:
      case CHn_AL1_READ_ADDR:
      case CHn_AL2_READ_ADDR:
      case CHn_AL3_READ_ADDR_TRIG:
        this.readAddr = value;
        break;
      case CHn_WRITE_ADDR:
      case CHn_AL1_WRITE_ADDR:
      case CHn_AL2_WRITE_ADDR_TRIG:
      case CHn_AL3_WRITE_ADDR:
        this.writeAddr = value;
        break;
      case CHn_TRANS_COUNT:
      case CHn_AL1_TRANS_COUNT_TRIG:
      case CHn_AL2_TRANS_COUNT:
      case CHn_AL3_TRANS_COUNT:
        this.transCountReload = value;
        break;
      case CHn_CTRL_TRIG:
      case CHn_AL1_CTRL:
      case CHn_AL2_CTRL:
      case CHn_AL3_CTRL: {
        this.ctrl = this.ctrl & ~CHn_CTRL_TRIG_WRITE_MASK | value & CHn_CTRL_TRIG_WRITE_MASK, this.ctrl &= ~(value & CHn_CTRL_TRIG_WC_MASK), this.treqValue = this.ctrl >> TREQ_SEL_SHIFT & TREQ_SEL_MASK, this.chainTo = this.ctrl >> CHAIN_TO_SHIFT & CHAIN_TO_MASK;
        let ringSize = this.ctrl >> RING_SIZE_SHIFT & RING_SIZE_MASK;
        switch (this.ringMask = ringSize ? (1 << ringSize) - 1 : 0, this.ctrl >> DATA_SIZE_SHIFT & DATA_SIZE_MASK) {
          case 1:
            this.dataSize = 2, this.transferFn = this.ctrl & BSWAP ? this.transferSwap16 : this.transfer16;
            break;
          case 2:
            this.dataSize = 4, this.transferFn = this.ctrl & BSWAP ? this.transferSwap32 : this.transfer32;
            break;
          case 0:
          default:
            this.transferFn = this.transfer8, this.dataSize = 1;
        }
        this.ctrl & EN && this.ctrl & BUSY && this.scheduleTransfer(), this.ctrl & EN || this.transferAlarm.cancel();
        break;
      }
      case CHn_DBG_CTDREQ:
        this.dreqCounter = 0;
        break;
    }
    (offset === CHn_AL3_READ_ADDR_TRIG || offset === CHn_AL2_WRITE_ADDR_TRIG || offset === CHn_AL1_TRANS_COUNT_TRIG || offset === CHn_CTRL_TRIG) && (value ? this.start() : this.ctrl & IRQ_QUIET && (this.dma.intRaw |= 1 << this.index, this.dma.checkInterrupts()));
  }
  reset() {
    this.writeUint32(CHn_CTRL_TRIG, this.index << CHAIN_TO_SHIFT);
  }
}, RPDMA = class extends BasePeripheral {
  constructor() {
    super(...arguments), this.channels = [
      new RPDMAChannel(this, this.rp2040, 0),
      new RPDMAChannel(this, this.rp2040, 1),
      new RPDMAChannel(this, this.rp2040, 2),
      new RPDMAChannel(this, this.rp2040, 3),
      new RPDMAChannel(this, this.rp2040, 4),
      new RPDMAChannel(this, this.rp2040, 5),
      new RPDMAChannel(this, this.rp2040, 6),
      new RPDMAChannel(this, this.rp2040, 7),
      new RPDMAChannel(this, this.rp2040, 8),
      new RPDMAChannel(this, this.rp2040, 9),
      new RPDMAChannel(this, this.rp2040, 10),
      new RPDMAChannel(this, this.rp2040, 11)
    ], this.intRaw = 0, this.intEnable0 = 0, this.intForce0 = 0, this.intEnable1 = 0, this.intForce1 = 0, this.timer0 = 0, this.timer1 = 0, this.timer2 = 0, this.timer3 = 0, this.dreq = Array(DREQChannel.DREQ_MAX);
  }
  get intStatus0() {
    return this.intRaw & this.intEnable0 | this.intForce0;
  }
  get intStatus1() {
    return this.intRaw & this.intEnable1 | this.intForce1;
  }
  readUint32(offset) {
    if ((offset & 2047) < CHANNEL_REGISTERS_SIZE) {
      let channelIndex = (offset & 2047) >> 6;
      return this.channels[channelIndex].readUint32(offset & CHANNEL_REGISTERS_MASK);
    }
    switch (offset) {
      case TIMER0:
        return this.timer0;
      case TIMER1:
        return this.timer1;
      case TIMER2:
        return this.timer2;
      case TIMER3:
        return this.timer3;
      case INTR:
        return this.intRaw;
      case INTE0:
        return this.intEnable0;
      case INTF0:
        return this.intForce0;
      case INTS0:
        return this.intStatus0;
      case INTE1:
        return this.intEnable1;
      case INTF1:
        return this.intForce1;
      case INTS1:
        return this.intStatus1;
      case N_CHANNELS:
        return this.channels.length;
    }
    return super.readUint32(offset);
  }
  writeUint32(offset, value) {
    if ((offset & 2047) < CHANNEL_REGISTERS_SIZE) {
      let channelIndex = (offset & 2047) >> 6;
      this.channels[channelIndex].writeUint32(offset & CHANNEL_REGISTERS_MASK, value);
      return;
    }
    switch (offset) {
      case TIMER0:
        this.timer0 = value;
        return;
      case TIMER1:
        this.timer1 = value;
        return;
      case TIMER2:
        this.timer2 = value;
        return;
      case TIMER3:
        this.timer3 = value;
        return;
      case INTR:
      case INTS0:
      case INTS1:
        this.intRaw &= ~this.rawWriteValue, this.checkInterrupts();
        return;
      case INTE0:
        this.intEnable0 = value & 65535, this.checkInterrupts();
        return;
      case INTF0:
        this.intForce0 = value & 65535, this.checkInterrupts();
        return;
      case INTE1:
        this.intEnable1 = value & 65535, this.checkInterrupts();
        return;
      case INTF1:
        this.intForce1 = value & 65535, this.checkInterrupts();
        return;
      case MULTI_CHAN_TRIGGER:
        for (let chan of this.channels)
          value & 1 << chan.index && chan.start();
        return;
      case CHAN_ABORT:
        for (let chan of this.channels)
          value & 1 << chan.index && chan.abort();
        return;
      default:
        super.writeUint32(offset, value);
    }
  }
  setDREQ(dreqChannel) {
    let { dreq } = this;
    if (!dreq[dreqChannel]) {
      dreq[dreqChannel] = !0;
      for (let channel of this.channels)
        channel.treq === dreqChannel && channel.active && channel.scheduleTransfer();
    }
  }
  clearDREQ(dreqChannel) {
    this.dreq[dreqChannel] = !1;
  }
  /**
   * Returns the number of microseconds for a cycle of the given DMA timer, or 0 if the timer is disabled.
   */
  getTimer(treq) {
    let dividend = 0, divisor = 1;
    switch (treq) {
      case TREQ.Permanent:
        dividend = 1, divisor = 1;
        break;
      case TREQ.Timer0:
        dividend = this.timer0 >>> 16, divisor = this.timer0 & 65535;
        break;
      case TREQ.Timer1:
        dividend = this.timer1 >>> 16, divisor = this.timer1 & 65535;
        break;
      case TREQ.Timer2:
        dividend = this.timer2 >>> 16, divisor = this.timer2 & 65535;
        break;
      case TREQ.Timer3:
        dividend = this.timer3 >>> 36, divisor = this.timer3 & 65535;
        break;
    }
    return divisor === 0 ? 0 : dividend / divisor * 1e6 / this.rp2040.clkSys;
  }
  checkInterrupts() {
    this.rp2040.setInterrupt(IRQ.DMA_IRQ0, !!this.intStatus0), this.rp2040.setInterrupt(IRQ.DMA_IRQ1, !!this.intStatus1);
  }
};

// node_modules/rp2040js/dist/esm/peripherals/pio.js
var CTRL = 0, FSTAT = 4, FDEBUG = 8, FLEVEL = 12, IRQ2 = 48, IRQ_FORCE = 52, INPUT_SYNC_BYPASS = 56, DBG_PADOUT = 60, DBG_PADOE = 64, DBG_CFGINFO = 68, INSTR_MEM0 = 72, INSTR_MEM31 = 196, INTR2 = 296, IRQ0_INTE = 300, IRQ0_INTF = 304, IRQ0_INTS = 308, IRQ1_INTE = 312, IRQ1_INTF = 316, IRQ1_INTS = 320, TXF0 = 16, TXF1 = 20, TXF2 = 24, TXF3 = 28, RXF0 = 32, RXF1 = 36, RXF2 = 40, RXF3 = 44, SM0_CLKDIV = 200, SM0_EXECCTRL = 204, SM0_SHIFTCTRL = 208, SM0_ADDR = 212, SM0_INSTR = 216, SM0_PINCTRL = 220, SM1_CLKDIV = 224, SM1_PINCTRL = 244, SM2_CLKDIV = 248, SM2_PINCTRL = 268, SM3_CLKDIV = 272, SM3_PINCTRL = 292, FSTAT_TXEMPTY = 1 << 24, FSTAT_TXFULL = 65536, FSTAT_RXEMPTY = 256, FSTAT_RXFULL = 1, FDEBUG_TXSTALL = 1 << 24, FDEBUG_TXOVER = 65536, FDEBUG_RXUNDER = 256, FDEBUG_RXSTALL = 1, SHIFTCTRL_AUTOPUSH = 65536, SHIFTCTRL_AUTOPULL = 1 << 17, SHIFTCTRL_IN_SHIFTDIR = 1 << 18, SHIFTCTRL_OUT_SHIFTDIR = 1 << 19, EXECCTRL_STATUS_SEL = 16, EXECCTRL_SIDE_PINDIR = 1 << 29, EXECCTRL_SIDE_EN = 1 << 30, EXECCTRL_EXEC_STALLED = 1 << 31, WaitType;
(function(WaitType2) {
  WaitType2[WaitType2.None = 0] = "None", WaitType2[WaitType2.Pin = 1] = "Pin", WaitType2[WaitType2.rxFIFO = 2] = "rxFIFO", WaitType2[WaitType2.txFIFO = 3] = "txFIFO", WaitType2[WaitType2.IRQ = 4] = "IRQ", WaitType2[WaitType2.Out = 5] = "Out";
})(WaitType || (WaitType = {}));
function bitReverse(x) {
  return x = (x & 1431655765) << 1 | (x & 2863311530) >>> 1, x = (x & 858993459) << 2 | (x & 3435973836) >>> 2, x = (x & 252645135) << 4 | (x & 4042322160) >>> 4, x = (x & 16711935) << 8 | (x & 4278255360) >>> 8, x = (x & 65535) << 16 | (x & 4294901760) >>> 16, x >>> 0;
}
function irqIndex(irq, machineIndex) {
  return !!(irq & 16) ? irq & 4 | (irq & 3) + machineIndex & 3 : irq & 7;
}
var dreqRx0 = [
  DREQChannel.DREQ_PIO0_RX0,
  DREQChannel.DREQ_PIO0_RX1,
  DREQChannel.DREQ_PIO0_RX2,
  DREQChannel.DREQ_PIO0_RX3
], dreqTx0 = [
  DREQChannel.DREQ_PIO0_TX0,
  DREQChannel.DREQ_PIO0_TX1,
  DREQChannel.DREQ_PIO0_TX2,
  DREQChannel.DREQ_PIO0_TX3
], dreqRx1 = [
  DREQChannel.DREQ_PIO1_RX0,
  DREQChannel.DREQ_PIO1_RX1,
  DREQChannel.DREQ_PIO1_RX2,
  DREQChannel.DREQ_PIO1_RX3
], dreqTx1 = [
  DREQChannel.DREQ_PIO1_TX0,
  DREQChannel.DREQ_PIO1_TX1,
  DREQChannel.DREQ_PIO1_TX2,
  DREQChannel.DREQ_PIO1_TX3
], StateMachine = class {
  constructor(rp2040, pio, index) {
    this.rp2040 = rp2040, this.pio = pio, this.index = index, this.enabled = !1, this.x = 0, this.y = 0, this.pc = 0, this.inputShiftReg = 0, this.inputShiftCount = 0, this.outputShiftReg = 0, this.outputShiftCount = 0, this.cycles = 0, this.execOpcode = 0, this.execValid = !1, this.updatePC = !0, this.clockDivInt = 1, this.clockDivFrac = 0, this.execCtrl = 126976, this.shiftCtrl = 3 << 18, this.pinCtrl = 5 << 26, this.rxFIFO = new FIFO(4), this.txFIFO = new FIFO(4), this.outPinValues = 0, this.outPinDirection = 0, this.waiting = !1, this.waitType = WaitType.None, this.waitIndex = 0, this.waitPolarity = !1, this.waitDelay = -1, this.dreqRx = this.pio.dreqRx[this.index], this.dreqTx = this.pio.dreqTx[this.index], this.updateDMARx(), this.updateDMATx();
  }
  updateDMATx() {
    this.txFIFO.full ? this.rp2040.dma.clearDREQ(this.dreqTx) : this.rp2040.dma.setDREQ(this.dreqTx);
  }
  updateDMARx() {
    this.rxFIFO.empty ? this.rp2040.dma.clearDREQ(this.dreqRx) : this.rp2040.dma.setDREQ(this.dreqRx);
  }
  writeFIFO(value) {
    if (this.txFIFO.full) {
      this.pio.fdebug |= FDEBUG_TXOVER << this.index;
      return;
    }
    this.txFIFO.push(value), this.pio.txStall &= ~(FDEBUG_TXSTALL << this.index), this.updateDMATx(), this.checkWait(), this.txFIFO.full && this.pio.checkInterrupts();
  }
  readFIFO() {
    if (this.rxFIFO.empty)
      return this.pio.fdebug |= FDEBUG_RXUNDER << this.index, 0;
    let result = this.rxFIFO.pull();
    return this.pio.rxStall &= ~(FDEBUG_RXSTALL << this.index), this.updateDMARx(), this.checkWait(), this.rxFIFO.empty && this.pio.checkInterrupts(), result;
  }
  get status() {
    let statusN = this.execCtrl & 15;
    return this.execCtrl & EXECCTRL_STATUS_SEL ? this.rxFIFO.itemCount < statusN ? 4294967295 : 0 : this.txFIFO.itemCount < statusN ? 4294967295 : 0;
  }
  jmpCondition(condition) {
    switch (condition) {
      // (no condition): Always
      case 0:
        return !0;
      // !X: scratch X zero
      case 1:
        return this.x === 0;
      // X--: scratch X non-zero, post-decrement
      case 2: {
        let oldX = this.x;
        return this.x = this.x - 1 >>> 0, oldX !== 0;
      }
      // !Y: scratch Y zero
      case 3:
        return this.y === 0;
      // Y--: scratch Y non-zero, post-decrement
      case 4: {
        let oldY = this.y;
        return this.y = this.y - 1 >>> 0, oldY !== 0;
      }
      // X!=Y: scratch X not equal scratch Y
      case 5:
        return this.x >>> 0 !== this.y >>> 0;
      // PIN: branch on input pin
      case 6: {
        let { gpio } = this.rp2040, { jmpPin } = this;
        return jmpPin < gpio.length ? gpio[jmpPin].inputValue : !1;
      }
      // !OSRE: output shift register not empty
      case 7:
        return this.outputShiftCount < this.pullThreshold;
    }
    return this.pio.error(`jmpCondition with unsupported condition: ${condition}`), !1;
  }
  get inPins() {
    let { gpioValues } = this.rp2040, { inBase } = this;
    return inBase ? gpioValues << 32 - inBase | gpioValues >>> inBase : gpioValues;
  }
  inSourceValue(source) {
    switch (source) {
      // PINS
      case 0:
        return this.inPins;
      // X (scratch register X)
      case 1:
        return this.x;
      // Y (scratch register Y)
      case 2:
        return this.y;
      // NULL (all zeroes)
      case 3:
        return 0;
      // Reserved
      case 4:
        return 0;
      // Reserved for IN, STATUS for MOV
      case 5:
        return this.status;
      // ISR
      case 6:
        return this.inputShiftReg;
      // OSR
      case 7:
        return this.outputShiftReg;
    }
    return this.pio.error(`inSourceValue with unsupported source: ${source}`), 0;
  }
  writeOutValue(destination, value, bitCount) {
    switch (destination) {
      // PINS
      case 0:
        this.setOutPins(value);
        break;
      // X (scratch register X)
      case 1:
        this.x = value;
        break;
      // Y (scratch register Y)
      case 2:
        this.y = value;
        break;
      // NULL (discard data)
      case 3:
        break;
      // PINDIRS
      case 4:
        this.setOutPinDirs(value);
        break;
      // PC
      case 5:
        this.pc = value & 31, this.updatePC = !1;
        break;
      // ISR (also sets ISR shift counter to Bit count)
      case 6:
        this.inputShiftReg = value, this.inputShiftCount = bitCount;
        break;
      // EXEC (Execute OSR shift data as instruction)
      case 7:
        this.execOpcode = value, this.execValid = !0;
        break;
    }
  }
  get pushThreshold() {
    let value = this.shiftCtrl >> 20 & 31;
    return value || 32;
  }
  get pullThreshold() {
    let value = this.shiftCtrl >> 25 & 31;
    return value || 32;
  }
  get sidesetCount() {
    return this.pinCtrl >> 29 & 7;
  }
  get setCount() {
    return this.pinCtrl >> 26 & 7;
  }
  get outCount() {
    return this.pinCtrl >> 20 & 63;
  }
  get inBase() {
    return this.pinCtrl >> 15 & 31;
  }
  get sidesetBase() {
    return this.pinCtrl >> 10 & 31;
  }
  get setBase() {
    return this.pinCtrl >> 5 & 31;
  }
  get outBase() {
    return this.pinCtrl >> 0 & 31;
  }
  get jmpPin() {
    return this.execCtrl >> 24 & 31;
  }
  get wrapTop() {
    return this.execCtrl >> 12 & 31;
  }
  get wrapBottom() {
    return this.execCtrl >> 7 & 31;
  }
  setOutPinDirs(value) {
    this.outPinDirection = value, this.pio.pinDirectionsChanged(value, this.outBase, this.outCount);
  }
  setOutPins(value) {
    this.outPinValues = value, this.pio.pinValuesChanged(value, this.outBase, this.outCount);
  }
  outInstruction(arg) {
    let bitCount = arg & 31, destination = arg >> 5;
    if (bitCount === 0)
      this.writeOutValue(destination, this.outputShiftReg, 32), this.outputShiftCount = 32;
    else {
      if (this.shiftCtrl & SHIFTCTRL_OUT_SHIFTDIR) {
        let value = this.outputShiftReg & (1 << bitCount) - 1;
        this.outputShiftReg >>>= bitCount, this.writeOutValue(destination, value, bitCount);
      } else {
        let value = this.outputShiftReg >>> 32 - bitCount;
        this.outputShiftReg <<= bitCount, this.writeOutValue(destination, value, bitCount);
      }
      this.outputShiftCount += bitCount, this.outputShiftCount > 32 && (this.outputShiftCount = 32);
    }
  }
  executeInstruction(opcode) {
    let arg = opcode & 255;
    switch (opcode >>> 13) {
      /* JMP */
      case 0:
        this.jmpCondition(arg >> 5) && (this.pc = arg & 31, this.updatePC = !1);
        break;
      /* WAIT */
      case 1: {
        let polarity = !!(arg & 128), source = arg >> 5 & 3, index = arg & 31;
        switch (source) {
          // GPIO:
          case 0:
            this.wait(WaitType.Pin, polarity, index);
            break;
          // PIN:
          case 1:
            this.wait(WaitType.Pin, polarity, (index + this.inBase) % 32);
            break;
          // IRQ:
          case 2:
            this.wait(WaitType.IRQ, polarity, irqIndex(index, this.index));
            break;
        }
        break;
      }
      /* IN */
      case 2: {
        let bitCount = arg & 31, sourceValue = this.inSourceValue(arg >> 5);
        bitCount == 0 ? (this.inputShiftReg = sourceValue, this.inputShiftCount = 32) : (sourceValue &= (1 << bitCount) - 1, this.shiftCtrl & SHIFTCTRL_IN_SHIFTDIR ? (this.inputShiftReg >>>= bitCount, this.inputShiftReg |= sourceValue << 32 - bitCount) : (this.inputShiftReg <<= bitCount, this.inputShiftReg |= sourceValue), this.inputShiftCount += bitCount, this.inputShiftCount > 32 && (this.inputShiftCount = 32)), this.shiftCtrl & SHIFTCTRL_AUTOPUSH && this.inputShiftCount >= this.pushThreshold && (this.rxFIFO.full ? (this.pio.rxStall |= FDEBUG_RXSTALL << this.index, this.pio.fdebug |= this.pio.rxStall, this.wait(WaitType.rxFIFO, !1, this.inputShiftReg)) : (this.rxFIFO.push(this.inputShiftReg), this.updateDMARx(), this.pio.checkInterrupts()), this.inputShiftCount = 0, this.inputShiftReg = 0);
        break;
      }
      /* OUT */
      case 3: {
        this.shiftCtrl & SHIFTCTRL_AUTOPULL && this.outputShiftCount >= this.pullThreshold && (this.outputShiftCount = 0, this.txFIFO.empty ? (this.pio.txStall |= FDEBUG_TXSTALL << this.index, this.pio.fdebug |= this.pio.txStall, this.wait(WaitType.Out, !1, arg)) : (this.outputShiftReg = this.txFIFO.pull(), this.updateDMATx(), this.pio.checkInterrupts())), this.waiting || this.outInstruction(arg);
        break;
      }
      /* PUSH/PULL */
      case 4: {
        let block = !!(arg & 32), ifFullOrEmpty = !!(arg & 64);
        if (arg & 31)
          break;
        if (arg & 128) {
          if (ifFullOrEmpty && this.shiftCtrl & SHIFTCTRL_AUTOPULL && this.outputShiftCount < this.pullThreshold)
            break;
          this.txFIFO.empty ? (this.pio.txStall |= FDEBUG_TXSTALL << this.index, this.pio.fdebug |= this.pio.txStall, block ? this.wait(WaitType.txFIFO, !1, 0) : this.outputShiftReg = this.x) : (this.outputShiftReg = this.txFIFO.pull(), this.updateDMATx(), this.pio.checkInterrupts()), this.outputShiftCount = 0;
        } else {
          if (ifFullOrEmpty && this.shiftCtrl & SHIFTCTRL_AUTOPUSH && this.inputShiftCount < this.pushThreshold)
            break;
          this.rxFIFO.full ? (this.pio.rxStall |= FDEBUG_RXSTALL << this.index, this.pio.fdebug |= this.pio.rxStall, block && this.wait(WaitType.rxFIFO, !1, this.inputShiftReg)) : (this.rxFIFO.push(this.inputShiftReg), this.updateDMARx(), this.pio.checkInterrupts()), this.inputShiftReg = 0, this.inputShiftCount = 0;
        }
        break;
      }
      /* MOV */
      case 5: {
        let source = arg & 7, op = arg >> 3 & 3, destination = arg >> 5 & 7, value = this.inSourceValue(source), transformedValue = this.transformMovValue(value, op) >>> 0;
        this.setMovDestination(destination, transformedValue);
        break;
      }
      /* IRQ */
      case 6: {
        if (arg & 128)
          break;
        let clear = !!(arg & 64), wait = !!(arg & 32), irq = irqIndex(arg & 31, this.index);
        clear ? (this.pio.irq &= ~(1 << irq), this.pio.irqUpdated()) : (this.pio.irq |= 1 << irq, this.pio.irqUpdated(), wait && this.wait(WaitType.IRQ, !1, irq));
        break;
      }
      /* SET */
      case 7: {
        let data = arg & 31;
        switch (arg >> 5) {
          case 0:
            this.setSetPins(data);
            break;
          case 1:
            this.x = data;
            break;
          case 2:
            this.y = data;
            break;
          case 4:
            this.setSetPinDirs(data);
            break;
        }
        break;
      }
    }
    this.cycles++;
    let { sidesetCount, execCtrl } = this, delaySideset = opcode >> 8 & 31, sideEn = !!(execCtrl & EXECCTRL_SIDE_EN), delay = delaySideset & (1 << 5 - sidesetCount) - 1;
    if (sidesetCount && (!sideEn || delaySideset & 16)) {
      let sideset = delaySideset >> 5 - sidesetCount;
      this.setSideset(sideset, sideEn ? sidesetCount - 1 : sidesetCount);
    }
    this.execValid ? (this.execValid = !1, this.executeInstruction(this.execOpcode)) : this.waiting ? (this.waitDelay < 0 && (this.waitDelay = delay), this.checkWait()) : this.cycles += delay;
  }
  wait(type, polarity, index) {
    this.waiting = !0, this.waitType = type, this.waitPolarity = polarity, this.waitIndex = index, this.waitDelay = -1, this.updatePC = !1;
  }
  nextPC() {
    this.pc === this.wrapTop ? this.pc = this.wrapBottom : this.pc = this.pc + 1 & 31;
  }
  step() {
    this.waiting && (this.checkWait(), this.waiting) || (this.updatePC = !0, this.executeInstruction(this.pio.instructions[this.pc]), this.updatePC && this.nextPC());
  }
  setSetPinDirs(value) {
    this.pio.pinDirectionsChanged(value, this.setBase, this.setCount);
  }
  setSetPins(value) {
    this.pio.pinValuesChanged(value, this.setBase, this.setCount);
  }
  setSideset(value, count) {
    this.execCtrl & EXECCTRL_SIDE_PINDIR ? this.pio.pinDirectionsChanged(value, this.sidesetBase, count) : this.pio.pinValuesChanged(value, this.sidesetBase, count);
  }
  transformMovValue(value, op) {
    switch (op) {
      case 0:
        return value;
      case 1:
        return ~value;
      case 2:
        return bitReverse(value);
      case 3:
      default:
        return value;
    }
  }
  setMovDestination(destination, value) {
    switch (destination) {
      // PINS
      case 0:
        this.setOutPins(value);
        break;
      // X (scratch register X)
      case 1:
        this.x = value;
        break;
      // Y (scratch register Y)
      case 2:
        this.y = value;
        break;
      // reserved (discard data)
      case 3:
        break;
      // EXEC
      case 4:
        this.execOpcode = value, this.execValid = !0;
        break;
      // PC
      case 5:
        this.pc = value & 31, this.updatePC = !1;
        break;
      // ISR (Input shift counter is reset to 0 by this operation, i.e. empty)
      case 6:
        this.inputShiftReg = value, this.inputShiftCount = 0;
        break;
      // OSR (Output shift counter is reset to 0 by this operation, i.e. full)
      case 7:
        this.outputShiftReg = value, this.outputShiftCount = 0;
        break;
    }
  }
  readUint32(offset) {
    switch (offset + SM0_CLKDIV) {
      case SM0_CLKDIV:
        return this.clockDivInt << 16 | this.clockDivFrac << 8;
      case SM0_EXECCTRL:
        return this.execCtrl;
      case SM0_SHIFTCTRL:
        return this.shiftCtrl;
      case SM0_ADDR:
        return this.pc;
      case SM0_INSTR:
        return this.pio.instructions[this.pc];
      case SM0_PINCTRL:
        return this.pinCtrl;
    }
    return this.pio.error(`Read from invalid state machine register: ${offset}`), 0;
  }
  writeUint32(offset, value) {
    switch (offset + SM0_CLKDIV) {
      case SM0_CLKDIV:
        this.clockDivFrac = value >>> 8 & 255, this.clockDivInt = value >>> 16;
        break;
      case SM0_EXECCTRL:
        this.execCtrl = (value & 2147483647 | this.execCtrl & 2147483648) >>> 0;
        break;
      case SM0_SHIFTCTRL:
        this.shiftCtrl = value;
        break;
      case SM0_ADDR:
        break;
      case SM0_INSTR:
        this.executeInstruction(value & 65535), this.waiting && (this.execCtrl |= EXECCTRL_EXEC_STALLED);
        break;
      case SM0_PINCTRL:
        this.pinCtrl = value;
        break;
      default:
        this.pio.error(`Write to invalid state machine register: ${offset}`);
    }
  }
  get fifoStat() {
    return ((this.txFIFO.empty ? FSTAT_TXEMPTY : 0) | (this.txFIFO.full ? FSTAT_TXFULL : 0) | (this.rxFIFO.empty ? FSTAT_RXEMPTY : 0) | (this.rxFIFO.full ? FSTAT_RXFULL : 0)) << this.index;
  }
  restart() {
    this.cycles = 0, this.inputShiftCount = 0, this.outputShiftCount = 32, this.inputShiftReg = 0, this.waiting = !1;
  }
  clkDivRestart() {
    this.pio.warn("clkDivRestart not implemented");
  }
  checkWait() {
    if (this.waiting) {
      switch (this.waitType) {
        case WaitType.IRQ: {
          let irqValue = !!(this.pio.irq & 1 << this.waitIndex);
          irqValue === this.waitPolarity && (this.waiting = !1, irqValue && (this.pio.irq &= ~(1 << this.waitIndex)));
          break;
        }
        case WaitType.Pin: {
          this.waitIndex < this.rp2040.gpio.length && this.rp2040.gpio[this.waitIndex].inputValue === this.waitPolarity && (this.waiting = !1);
          break;
        }
        case WaitType.rxFIFO: {
          this.rxFIFO.full || (this.rxFIFO.push(this.waitIndex), this.waiting = !1, this.updateDMARx(), this.pio.checkInterrupts());
          break;
        }
        case WaitType.txFIFO: {
          this.txFIFO.empty || (this.outputShiftReg = this.txFIFO.pull(), this.waiting = !1, this.updateDMATx(), this.pio.checkInterrupts());
          break;
        }
        case WaitType.Out: {
          this.txFIFO.empty || (this.outputShiftReg = this.txFIFO.pull(), this.outInstruction(this.waitIndex), this.waiting = !1, this.updateDMATx(), this.pio.checkInterrupts());
          break;
        }
      }
      this.waiting || (this.nextPC(), this.cycles += this.waitDelay, this.execCtrl &= ~EXECCTRL_EXEC_STALLED);
    }
  }
}, RPPIO = class extends BasePeripheral {
  constructor(rp2040, name, firstIrq, index) {
    super(rp2040, name), this.firstIrq = firstIrq, this.index = index, this.instructions = new Uint32Array(32), this.dreqRx = this.index ? dreqRx1 : dreqRx0, this.dreqTx = this.index ? dreqTx1 : dreqTx0, this.machines = [
      new StateMachine(this.rp2040, this, 0),
      new StateMachine(this.rp2040, this, 1),
      new StateMachine(this.rp2040, this, 2),
      new StateMachine(this.rp2040, this, 3)
    ], this.stopped = !0, this.fdebug = 0, this.txStall = 0, this.rxStall = 0, this.inputSyncBypass = 0, this.irq = 0, this.pinValues = 0, this.pinDirections = 0, this.oldPinValues = 0, this.oldPinDirections = 0, this.runTimer = null, this.irq0IntEnable = 0, this.irq0IntForce = 0, this.irq1IntEnable = 0, this.irq1IntForce = 0;
  }
  get intRaw() {
    return (this.irq & 15) << 8 | (this.machines[3].txFIFO.full ? 0 : 128) | (this.machines[2].txFIFO.full ? 0 : 64) | (this.machines[1].txFIFO.full ? 0 : 32) | (this.machines[0].txFIFO.full ? 0 : 16) | (this.machines[3].rxFIFO.empty ? 0 : 8) | (this.machines[2].rxFIFO.empty ? 0 : 4) | (this.machines[1].rxFIFO.empty ? 0 : 2) | (this.machines[0].rxFIFO.empty ? 0 : 1);
  }
  get irq0IntStatus() {
    return this.intRaw & this.irq0IntEnable | this.irq0IntForce;
  }
  get irq1IntStatus() {
    return this.intRaw & this.irq1IntEnable | this.irq1IntForce;
  }
  readUint32(offset) {
    if (offset >= SM0_CLKDIV && offset <= SM0_PINCTRL)
      return this.machines[0].readUint32(offset - SM0_CLKDIV);
    if (offset >= SM1_CLKDIV && offset <= SM1_PINCTRL)
      return this.machines[1].readUint32(offset - SM1_CLKDIV);
    if (offset >= SM2_CLKDIV && offset <= SM2_PINCTRL)
      return this.machines[2].readUint32(offset - SM2_CLKDIV);
    if (offset >= SM3_CLKDIV && offset <= SM3_PINCTRL)
      return this.machines[3].readUint32(offset - SM3_CLKDIV);
    switch (offset) {
      case CTRL:
        return (this.machines[0].enabled ? 1 : 0) | (this.machines[1].enabled ? 2 : 0) | (this.machines[2].enabled ? 4 : 0) | (this.machines[3].enabled ? 8 : 0);
      case FSTAT:
        return this.machines[0].fifoStat | this.machines[1].fifoStat | this.machines[2].fifoStat | this.machines[3].fifoStat;
      case FDEBUG:
        return this.fdebug;
      case FLEVEL:
        return this.machines[0].txFIFO.itemCount & 15 | (this.machines[0].rxFIFO.itemCount & 15) << 4 | (this.machines[1].txFIFO.itemCount & 15) << 8 | (this.machines[1].rxFIFO.itemCount & 15) << 12 | (this.machines[2].txFIFO.itemCount & 15) << 16 | (this.machines[2].rxFIFO.itemCount & 15) << 20 | (this.machines[3].txFIFO.itemCount & 15) << 24 | (this.machines[3].rxFIFO.itemCount & 15) << 28;
      case RXF0:
        return this.machines[0].readFIFO();
      case RXF1:
        return this.machines[1].readFIFO();
      case RXF2:
        return this.machines[2].readFIFO();
      case RXF3:
        return this.machines[3].readFIFO();
      case IRQ2:
        return this.irq;
      case IRQ_FORCE:
        return 0;
      case INPUT_SYNC_BYPASS:
        return this.inputSyncBypass;
      case DBG_PADOUT:
        return this.pinValues;
      case DBG_PADOE:
        return this.pinDirections;
      case DBG_CFGINFO:
        return 2098180;
      case INTR2:
        return this.intRaw;
      case IRQ0_INTE:
        return this.irq0IntEnable;
      case IRQ0_INTF:
        return this.irq0IntForce;
      case IRQ0_INTS:
        return this.irq0IntStatus;
      case IRQ1_INTE:
        return this.irq1IntEnable;
      case IRQ1_INTF:
        return this.irq1IntForce;
      case IRQ1_INTS:
        return this.irq1IntStatus;
    }
    return super.readUint32(offset);
  }
  writeUint32(offset, value) {
    if (offset >= INSTR_MEM0 && offset <= INSTR_MEM31) {
      let index = offset - INSTR_MEM0 >> 2;
      this.instructions[index] = value & 65535;
      return;
    }
    if (offset >= SM0_CLKDIV && offset <= SM0_PINCTRL) {
      this.machines[0].writeUint32(offset - SM0_CLKDIV, value);
      return;
    }
    if (offset >= SM1_CLKDIV && offset <= SM1_PINCTRL) {
      this.machines[1].writeUint32(offset - SM1_CLKDIV, value);
      return;
    }
    if (offset >= SM2_CLKDIV && offset <= SM2_PINCTRL) {
      this.machines[2].writeUint32(offset - SM2_CLKDIV, value);
      return;
    }
    if (offset >= SM3_CLKDIV && offset <= SM3_PINCTRL) {
      this.machines[3].writeUint32(offset - SM3_CLKDIV, value);
      return;
    }
    switch (offset) {
      case CTRL: {
        for (let index = 0; index < 4; index++)
          this.machines[index].enabled = !!(value & 1 << index), value & 1 << 4 + index && this.machines[index].restart(), value & 1 << 8 + index && this.machines[index].clkDivRestart();
        let shouldRun = value & 15;
        this.stopped && shouldRun && (this.stopped = !1, this.run()), shouldRun || (this.stopped = !0);
        break;
      }
      case FDEBUG:
        this.fdebug &= ~this.rawWriteValue, this.fdebug |= this.txStall | this.rxStall;
        break;
      case TXF0:
        this.machines[0].writeFIFO(value);
        break;
      case TXF1:
        this.machines[1].writeFIFO(value);
        break;
      case TXF2:
        this.machines[2].writeFIFO(value);
        break;
      case TXF3:
        this.machines[3].writeFIFO(value);
        break;
      case IRQ2:
        this.irq &= ~this.rawWriteValue, this.irqUpdated();
        break;
      case INPUT_SYNC_BYPASS:
        this.inputSyncBypass = value;
        break;
      case IRQ_FORCE:
        this.irq |= value, this.irqUpdated();
        break;
      case IRQ0_INTE:
        this.irq0IntEnable = value & 4095, this.checkInterrupts();
        break;
      case IRQ0_INTF:
        this.irq0IntForce = value & 4095, this.checkInterrupts();
        break;
      case IRQ1_INTE:
        this.irq1IntEnable = value & 4095, this.checkInterrupts();
        break;
      case IRQ1_INTF:
        this.irq1IntForce = value & 4095, this.checkInterrupts();
        break;
      default:
        super.writeUint32(offset, value);
    }
  }
  pinValuesChanged(value, firstPin, count) {
    let mask = count > 31 ? 4294967295 : (1 << count) - 1 << firstPin, newValue = (this.pinValues & ~mask | value << firstPin & mask) & 1073741823;
    this.pinValues = newValue;
  }
  pinDirectionsChanged(value, firstPin, count) {
    let mask = count > 31 ? 4294967295 : (1 << count) - 1 << firstPin, newValue = (this.pinDirections & ~mask | value << firstPin & mask) & 1073741823;
    this.pinDirections = newValue;
  }
  checkInterrupts() {
    let { firstIrq } = this;
    this.rp2040.setInterrupt(firstIrq, !!this.irq0IntStatus), this.rp2040.setInterrupt(firstIrq + 1, !!this.irq1IntStatus);
  }
  irqUpdated() {
    for (let machine of this.machines)
      machine.checkWait();
    this.checkInterrupts();
  }
  checkChangedPins() {
    let changedPins = this.oldPinDirections ^ this.pinDirections | this.oldPinValues ^ this.pinValues;
    if (changedPins) {
      this.oldPinDirections = this.pinDirections, this.oldPinValues = this.pinValues;
      let { gpio } = this.rp2040;
      for (let gpioIndex = 0; gpioIndex < gpio.length; gpioIndex++)
        changedPins & 1 << gpioIndex && gpio[gpioIndex].checkForUpdates();
    }
  }
  step() {
    for (let machine of this.machines)
      machine.step();
    this.checkChangedPins();
  }
  run() {
    for (let i = 0; i < 1e3 && !this.stopped; i++)
      this.step();
    this.stopped || (this.runTimer = setTimeout(() => this.run(), 0));
  }
  stop() {
    for (let machine of this.machines)
      machine.enabled = !1;
    this.stopped = !0, this.runTimer && (clearTimeout(this.runTimer), this.runTimer = null);
  }
};

// node_modules/rp2040js/dist/esm/gpio-pin.js
var GPIOPinState;
(function(GPIOPinState2) {
  GPIOPinState2[GPIOPinState2.Low = 0] = "Low", GPIOPinState2[GPIOPinState2.High = 1] = "High", GPIOPinState2[GPIOPinState2.Input = 2] = "Input", GPIOPinState2[GPIOPinState2.InputPullUp = 3] = "InputPullUp", GPIOPinState2[GPIOPinState2.InputPullDown = 4] = "InputPullDown", GPIOPinState2[GPIOPinState2.InputBusKeeper = 5] = "InputBusKeeper";
})(GPIOPinState || (GPIOPinState = {}));
var FUNCTION_PWM = 4, FUNCTION_SIO = 5, FUNCTION_PIO0 = 6, FUNCTION_PIO1 = 7;
function applyOverride(value, overrideType) {
  switch (overrideType) {
    case 0:
      return value;
    case 1:
      return !value;
    case 2:
      return !1;
    case 3:
      return !0;
  }
  return console.error("applyOverride received invalid override type", overrideType), value;
}
var IRQ_EDGE_HIGH = 8, IRQ_EDGE_LOW = 4, IRQ_LEVEL_HIGH = 2, IRQ_LEVEL_LOW = 1, GPIOPin = class {
  constructor(rp2040, index, name = index.toString()) {
    this.rp2040 = rp2040, this.index = index, this.name = name, this.rawInputValue = !1, this.lastValue = this.value, this.ctrl = 31, this.padValue = 54, this.irqEnableMask = 0, this.irqForceMask = 0, this.irqStatus = 0, this.listeners = /* @__PURE__ */ new Set();
  }
  get rawInterrupt() {
    return !!(this.irqStatus & this.irqEnableMask | this.irqForceMask);
  }
  get isSlewFast() {
    return !!(this.padValue & 1);
  }
  get schmittEnabled() {
    return !!(this.padValue & 2);
  }
  get pulldownEnabled() {
    return !!(this.padValue & 4);
  }
  get pullupEnabled() {
    return !!(this.padValue & 8);
  }
  get driveStrength() {
    return this.padValue >> 4 & 3;
  }
  get inputEnable() {
    return !!(this.padValue & 64);
  }
  get outputDisable() {
    return !!(this.padValue & 128);
  }
  get functionSelect() {
    return this.ctrl & 31;
  }
  get outputOverride() {
    return this.ctrl >> 8 & 3;
  }
  get outputEnableOverride() {
    return this.ctrl >> 12 & 3;
  }
  get inputOverride() {
    return this.ctrl >> 16 & 3;
  }
  get irqOverride() {
    return this.ctrl >> 28 & 3;
  }
  get rawOutputEnable() {
    let { index, rp2040, functionSelect } = this, bitmask = 1 << index;
    switch (functionSelect) {
      case FUNCTION_PWM:
        return !!(rp2040.pwm.gpioDirection & bitmask);
      case FUNCTION_SIO:
        return !!(rp2040.sio.gpioOutputEnable & bitmask);
      case FUNCTION_PIO0:
        return !!(rp2040.pio[0].pinDirections & bitmask);
      case FUNCTION_PIO1:
        return !!(rp2040.pio[1].pinDirections & bitmask);
      default:
        return !1;
    }
  }
  get rawOutputValue() {
    let { index, rp2040, functionSelect } = this, bitmask = 1 << index;
    switch (functionSelect) {
      case FUNCTION_PWM:
        return !!(rp2040.pwm.gpioValue & bitmask);
      case FUNCTION_SIO:
        return !!(rp2040.sio.gpioValue & bitmask);
      case FUNCTION_PIO0:
        return !!(rp2040.pio[0].pinValues & bitmask);
      case FUNCTION_PIO1:
        return !!(rp2040.pio[1].pinValues & bitmask);
      default:
        return !1;
    }
  }
  get inputValue() {
    return applyOverride(this.rawInputValue && this.inputEnable, this.inputOverride);
  }
  get irqValue() {
    return applyOverride(this.rawInterrupt, this.irqOverride);
  }
  get outputEnable() {
    return applyOverride(this.rawOutputEnable, this.outputEnableOverride);
  }
  get outputValue() {
    return applyOverride(this.rawOutputValue, this.outputOverride);
  }
  /**
   * Returns the STATUS register value for the pin, as outlined in section 2.19.6 of the datasheet
   */
  get status() {
    let irqToProc = this.irqValue ? 67108864 : 0, irqFromPad = this.rawInterrupt ? 1 << 24 : 0, inToPeri = this.inputValue ? 1 << 19 : 0, inFromPad = this.rawInputValue ? 1 << 17 : 0, oeToPad = this.outputEnable ? 8192 : 0, oeFromPeri = this.rawOutputEnable ? 4096 : 0, outToPad = this.outputValue ? 512 : 0, outFromPeri = this.rawOutputValue ? 256 : 0;
    return irqToProc | irqFromPad | inToPeri | inFromPad | oeToPad | oeFromPeri | outToPad | outFromPeri;
  }
  get value() {
    return this.outputEnable ? this.outputValue ? GPIOPinState.High : GPIOPinState.Low : this.pulldownEnabled && this.pullupEnabled ? GPIOPinState.InputBusKeeper : this.pulldownEnabled ? GPIOPinState.InputPullDown : this.pullupEnabled ? GPIOPinState.InputPullUp : GPIOPinState.Input;
  }
  setInputValue(value) {
    this.rawInputValue = value;
    let prevIrqValue = this.irqValue;
    value && this.inputEnable ? (this.irqStatus |= IRQ_EDGE_HIGH | IRQ_LEVEL_HIGH, this.irqStatus &= ~IRQ_LEVEL_LOW) : (this.irqStatus |= IRQ_EDGE_LOW | IRQ_LEVEL_LOW, this.irqStatus &= ~IRQ_LEVEL_HIGH), this.irqValue !== prevIrqValue && this.rp2040.updateIOInterrupt(), this.functionSelect === FUNCTION_PWM && this.rp2040.pwm.gpioOnInput(this.index);
    for (let pio of this.rp2040.pio)
      for (let machine of pio.machines)
        machine.enabled && machine.waiting && machine.waitType === WaitType.Pin && machine.waitIndex === this.index && machine.checkWait();
  }
  checkForUpdates() {
    let { lastValue, value } = this;
    if (value !== lastValue) {
      this.lastValue = value;
      for (let listener of this.listeners)
        listener(value, lastValue);
    }
  }
  refreshInput() {
    this.setInputValue(this.rawInputValue);
  }
  updateIRQValue(value) {
    value & IRQ_EDGE_LOW && this.irqStatus & IRQ_EDGE_LOW && (this.irqStatus &= ~IRQ_EDGE_LOW, this.rp2040.updateIOInterrupt()), value & IRQ_EDGE_HIGH && this.irqStatus & IRQ_EDGE_HIGH && (this.irqStatus &= ~IRQ_EDGE_HIGH, this.rp2040.updateIOInterrupt());
  }
  addListener(callback) {
    return this.listeners.add(callback), () => this.listeners.delete(callback);
  }
};

// node_modules/rp2040js/dist/esm/peripherals/adc.js
var CS = 0, RESULT = 4, FCS = 8, FIFO_REG = 12, DIV = 16, INTR3 = 20, INTE = 24, INTF = 28, INTS = 32, CS_RROBIN_MASK = 31, CS_RROBIN_SHIFT = 16, CS_AINSEL_MASK = 7, CS_AINSEL_SHIFT = 12, CS_ERR_STICKY = 1024, CS_ERR = 512, CS_READY = 256, CS_START_MANY = 8, CS_START_ONE = 4, CS_TS_EN = 2, CS_EN = 1, CS_WRITE_MASK = CS_RROBIN_MASK << CS_RROBIN_SHIFT | CS_AINSEL_MASK << CS_AINSEL_SHIFT | CS_START_MANY | CS_START_ONE | CS_TS_EN | CS_EN, FCS_THRES_MASK = 15, FCS_THRESH_SHIFT = 24, FCS_LEVEL_MASK = 15, FCS_LEVEL_SHIFT = 16, FCS_OVER = 2048, FCS_UNDER = 1024, FCS_FULL = 512, FCS_EMPTY = 256, FCS_DREQ_EN = 8, FCS_ERR = 4, FCS_SHIFT = 2, FCS_EN = 1, FCS_WRITE_MASK = FCS_THRES_MASK << FCS_THRESH_SHIFT | FCS_DREQ_EN | FCS_ERR | FCS_SHIFT | FCS_EN, FIFO_ERR = 32768, DIV_INT_MASK = 65535, DIV_INT_SHIFT = 8, DIV_FRAC_MASK = 255, DIV_FRAC_SHIFT = 0, FIFO_INT = 1, RPADC = class extends BasePeripheral {
  get temperatueEnable() {
    return this.cs & CS_TS_EN;
  }
  get enabled() {
    return this.cs & CS_EN;
  }
  get divider() {
    return 1 + (this.clockDiv >> DIV_INT_SHIFT & DIV_INT_MASK) + (this.clockDiv >> DIV_FRAC_SHIFT & DIV_FRAC_MASK) / 256;
  }
  get intRaw() {
    let thres = this.fcs >> FCS_THRESH_SHIFT & FCS_THRES_MASK;
    return this.fifo.itemCount >= thres ? FIFO_INT : 0;
  }
  get intStatus() {
    return this.intRaw & this.intEnable | this.intForce;
  }
  get activeChannel() {
    return this.cs >> CS_AINSEL_SHIFT & CS_AINSEL_MASK;
  }
  set activeChannel(channel) {
    this.cs &= ~(CS_AINSEL_MASK << CS_AINSEL_SHIFT), this.cs |= (channel & CS_AINSEL_SHIFT) << CS_AINSEL_SHIFT;
  }
  constructor(rp2040, name) {
    super(rp2040, name), this.numChannels = 5, this.resolution = 12, this.sampleTime = 2, this.channelValues = [0, 0, 0, 0, 0], this.onADCRead = (channel) => {
      this.currentChannel = channel, this.sampleAlarm.schedule(this.sampleTime * 1e3);
    }, this.fifo = new FIFO(4), this.dreq = DREQChannel.DREQ_ADC, this.cs = 0, this.fcs = 0, this.clockDiv = 0, this.intEnable = 0, this.intForce = 0, this.result = 0, this.busy = !1, this.err = !1, this.currentChannel = 0, this.sampleAlarm = this.rp2040.clock.createAlarm(() => this.completeADCRead(this.channelValues[this.currentChannel], !1)), this.multiShotAlarm = this.rp2040.clock.createAlarm(() => {
      this.cs & CS_START_MANY && this.startADCRead();
    });
  }
  checkInterrupts() {
    this.rp2040.setInterrupt(IRQ.ADC_FIFO, !!this.intStatus);
  }
  startADCRead() {
    this.busy = !0, this.onADCRead(this.activeChannel);
  }
  updateDMA() {
    if (this.fcs & FCS_DREQ_EN) {
      let thres = this.fcs >> FCS_THRESH_SHIFT & FCS_THRES_MASK;
      this.fifo.itemCount >= thres ? this.rp2040.dma.setDREQ(this.dreq) : this.rp2040.dma.clearDREQ(this.dreq);
    }
  }
  completeADCRead(value, error) {
    this.busy = !1, this.result = value, error ? this.cs |= CS_ERR_STICKY | CS_ERR : this.cs &= ~CS_ERR, this.fcs & FCS_EN && (this.fifo.full ? this.fcs |= FCS_OVER : (value &= 4095, this.fcs & FCS_SHIFT && (value >>= 4), error && this.fcs & FCS_ERR && (value |= FIFO_ERR), this.fifo.push(value), this.updateDMA(), this.checkInterrupts()));
    let round = this.cs >> CS_RROBIN_SHIFT & CS_RROBIN_MASK;
    if (round) {
      let channel = this.activeChannel + 1;
      for (; !(round & 1 << channel); )
        channel = (channel + 1) % this.numChannels;
      this.activeChannel = channel;
    }
    if (this.cs & CS_START_MANY) {
      let sampleTicks = 48 * this.sampleTime;
      if (this.divider > sampleTicks) {
        let micros = (this.divider - sampleTicks) / 48;
        this.multiShotAlarm.schedule(micros * 1e3);
      } else
        this.startADCRead();
    }
  }
  readUint32(offset) {
    switch (offset) {
      case CS:
        return this.cs | (this.err ? CS_ERR : 0) | (this.busy ? 0 : CS_READY);
      case RESULT:
        return this.result;
      case FCS:
        return this.fcs | (this.fifo.itemCount & FCS_LEVEL_MASK) << FCS_LEVEL_SHIFT | (this.fifo.full ? FCS_FULL : 0) | (this.fifo.empty ? FCS_EMPTY : 0);
      case FIFO_REG:
        if (this.fifo.empty)
          return this.fcs |= FCS_UNDER, 0;
        {
          let value = this.fifo.pull();
          return this.updateDMA(), value;
        }
      case DIV:
        return this.clockDiv;
      case INTR3:
        return this.intRaw;
      case INTE:
        return this.intEnable;
      case INTF:
        return this.intForce;
      case INTS:
        return this.intStatus;
    }
    return super.readUint32(offset);
  }
  writeUint32(offset, value) {
    switch (offset) {
      case CS:
        this.fcs &= ~(value & CS_ERR_STICKY), this.cs = this.cs & ~CS_WRITE_MASK | value & CS_WRITE_MASK, value & CS_EN && !this.busy && (value & CS_START_ONE || value & CS_START_MANY) && this.startADCRead();
        break;
      case FCS:
        this.fcs &= ~(value & (FCS_OVER | FCS_UNDER)), this.fcs = this.fcs & ~FCS_WRITE_MASK | value & FCS_WRITE_MASK, this.checkInterrupts();
        break;
      case DIV:
        this.clockDiv = value;
        break;
      case INTE:
        this.intEnable = value & FIFO_INT, this.checkInterrupts();
        break;
      case INTF:
        this.intForce = value & FIFO_INT, this.checkInterrupts();
        break;
      default:
        super.writeUint32(offset, value);
    }
  }
};

// node_modules/rp2040js/dist/esm/peripherals/busctrl.js
var BUS_PRIORITY_ACK = 4, PERFCTR0 = 8, PERFSEL0 = 12, PERFCTR1 = 16, PERFSEL1 = 20, PERFCTR2 = 24, PERFSEL2 = 28, PERFCTR3 = 32, PERFSEL3 = 36, RPBUSCTRL = class extends BasePeripheral {
  constructor(rp2040, name) {
    super(rp2040, name), this.voltageSelect = 0, this.perfCtr = [0, 0, 0, 0], this.perfSel = [31, 31, 31, 31];
  }
  readUint32(offset) {
    switch (offset) {
      case BUS_PRIORITY_ACK:
        return 1;
      case PERFCTR0:
        return this.perfCtr[0];
      case PERFSEL0:
        return this.perfSel[0];
      case PERFCTR1:
        return this.perfCtr[1];
      case PERFSEL1:
        return this.perfSel[1];
      case PERFCTR2:
        return this.perfCtr[2];
      case PERFSEL2:
        return this.perfSel[2];
      case PERFCTR3:
        return this.perfCtr[3];
      case PERFSEL3:
        return this.perfSel[3];
    }
    return super.readUint32(offset);
  }
  writeUint32(offset, value) {
    switch (offset) {
      case PERFCTR0:
        this.perfCtr[0] = 0;
        break;
      case PERFSEL0:
        this.perfSel[0] = value & 31;
        break;
      case PERFCTR1:
        this.perfCtr[1] = 0;
        break;
      case PERFSEL1:
        this.perfSel[1] = value & 31;
        break;
      case PERFCTR2:
        this.perfCtr[2] = 0;
        break;
      case PERFSEL2:
        this.perfSel[2] = value & 31;
        break;
      case PERFCTR3:
        this.perfCtr[3] = 0;
        break;
      case PERFSEL3:
        this.perfSel[3] = value & 31;
        break;
      default:
        super.writeUint32(offset, value);
    }
  }
};

// node_modules/rp2040js/dist/esm/peripherals/clocks.js
var CLK_GPOUT0_CTRL = 0, CLK_GPOUT0_DIV = 4, CLK_GPOUT0_SELECTED = 8, CLK_GPOUT1_CTRL = 12, CLK_GPOUT1_DIV = 16, CLK_GPOUT1_SELECTED = 20, CLK_GPOUT2_CTRL = 24, CLK_GPOUT2_DIV = 28, CLK_GPOUT2_SELECTED = 32, CLK_GPOUT3_CTRL = 36, CLK_GPOUT3_DIV = 40, CLK_GPOUT3_SELECTED = 44, CLK_REF_CTRL = 48, CLK_REF_DIV = 52, CLK_REF_SELECTED = 56, CLK_SYS_CTRL = 60, CLK_SYS_DIV = 64, CLK_SYS_SELECTED = 68, CLK_PERI_CTRL = 72, CLK_PERI_DIV = 76, CLK_PERI_SELECTED = 80, CLK_USB_CTRL = 84, CLK_USB_DIV = 88, CLK_USB_SELECTED = 92, CLK_ADC_CTRL = 96, CLK_ADC_DIV = 100, CLK_ADC_SELECTED = 104, CLK_RTC_CTRL = 108, CLK_RTC_DIV = 112, CLK_RTC_SELECTED = 116, CLK_SYS_RESUS_CTRL = 120, CLK_SYS_RESUS_STATUS = 124, CLK_REF_CTRL_SRC_MASK = 3, CLK_REF_CTRL_SRC_ROSC = 0, CLK_REF_CTRL_SRC_AUX = 1, CLK_REF_CTRL_SRC_XOSC = 2, CLK_REF_CTRL_AUXSRC_SHIFT = 5, CLK_REF_CTRL_AUXSRC_MASK = 3, CLK_REF_CTRL_AUXSRC_PLL_USB = 0, CLK_REF_DIV_INT_BITS = 768, CLK_SYS_CTRL_SRC_MASK = 1, CLK_SYS_CTRL_SRC_REF = 0, CLK_SYS_CTRL_AUXSRC_SHIFT = 5, CLK_SYS_CTRL_AUXSRC_MASK = 7, CLK_SYS_CTRL_AUXSRC_PLL_SYS = 0, CLK_SYS_CTRL_AUXSRC_PLL_USB = 1, CLK_SYS_CTRL_AUXSRC_ROSC = 2, CLK_SYS_CTRL_AUXSRC_XOSC = 3, CLK_PERI_CTRL_ENABLE = 2048, CLK_PERI_CTRL_KILL = 1024, CLK_PERI_CTRL_AUXSRC_SHIFT = 5, CLK_PERI_CTRL_AUXSRC_MASK = 7, CLK_PERI_CTRL_AUXSRC_CLK_SYS = 0, CLK_PERI_CTRL_AUXSRC_PLL_SYS = 1, CLK_PERI_CTRL_AUXSRC_PLL_USB = 2, CLK_PERI_CTRL_AUXSRC_ROSC = 3, CLK_PERI_CTRL_AUXSRC_XOSC = 4, CLK_DIV_INT_SHIFT = 8, CLK_DIV_FRAC_MASK = 255;
function clockDivisor(div) {
  let int = div >>> CLK_DIV_INT_SHIFT;
  return int ? int + (div & CLK_DIV_FRAC_MASK) / 256 : 65536;
}
var RPClocks = class extends BasePeripheral {
  constructor(rp2040, name) {
    super(rp2040, name), this.gpout0Ctrl = 0, this.gpout0Div = 256, this.gpout1Ctrl = 0, this.gpout1Div = 256, this.gpout2Ctrl = 0, this.gpout2Div = 256, this.gpout3Ctrl = 0, this.gpout3Div = 256, this.refCtrl = 0, this.refDiv = 256, this.periCtrl = 0, this.periDiv = 256, this.usbCtrl = 0, this.usbDiv = 256, this.sysCtrl = 0, this.sysDiv = 256, this.adcCtrl = 0, this.adcDiv = 256, this.rtcCtrl = 0, this.rtcDiv = 256;
  }
  /** clk_ref frequency, in Hz. GPIN0/GPIN1 are not modelled and yield 0. */
  get refFreq() {
    return this.refSourceFreq / clockDivisor(this.refDiv & CLK_REF_DIV_INT_BITS);
  }
  /** clk_sys frequency, in Hz. GPIN0/GPIN1 are not modelled and yield 0. */
  get sysFreq() {
    return this.sysSourceFreq / clockDivisor(this.sysDiv);
  }
  /**
   * clk_peri frequency, in Hz. Feeds the UART and SPI baud rate generators. Returns 0 while
   * the clock generator is stopped, and for the GPIN0/GPIN1 sources we do not model.
   */
  get periFreq() {
    let { rp2040 } = this;
    if (!(this.periCtrl & CLK_PERI_CTRL_ENABLE) || this.periCtrl & CLK_PERI_CTRL_KILL)
      return 0;
    switch (this.periCtrl >>> CLK_PERI_CTRL_AUXSRC_SHIFT & CLK_PERI_CTRL_AUXSRC_MASK) {
      case CLK_PERI_CTRL_AUXSRC_CLK_SYS:
        return this.sysFreq;
      case CLK_PERI_CTRL_AUXSRC_PLL_SYS:
        return rp2040.pllSys.frequency;
      case CLK_PERI_CTRL_AUXSRC_PLL_USB:
        return rp2040.pllUsb.frequency;
      case CLK_PERI_CTRL_AUXSRC_ROSC:
        return rp2040.roscFreq;
      case CLK_PERI_CTRL_AUXSRC_XOSC:
        return rp2040.xoscFreq;
      default:
        return 0;
    }
  }
  get refSourceFreq() {
    let { rp2040 } = this;
    switch (this.refCtrl & CLK_REF_CTRL_SRC_MASK) {
      case CLK_REF_CTRL_SRC_ROSC:
        return rp2040.roscFreq;
      case CLK_REF_CTRL_SRC_XOSC:
        return rp2040.xoscFreq;
      case CLK_REF_CTRL_SRC_AUX:
        return (this.refCtrl >>> CLK_REF_CTRL_AUXSRC_SHIFT & CLK_REF_CTRL_AUXSRC_MASK) === CLK_REF_CTRL_AUXSRC_PLL_USB ? rp2040.pllUsb.frequency : 0;
      default:
        return 0;
    }
  }
  get sysSourceFreq() {
    let { rp2040 } = this;
    if ((this.sysCtrl & CLK_SYS_CTRL_SRC_MASK) === CLK_SYS_CTRL_SRC_REF)
      return this.refFreq;
    switch (this.sysCtrl >>> CLK_SYS_CTRL_AUXSRC_SHIFT & CLK_SYS_CTRL_AUXSRC_MASK) {
      case CLK_SYS_CTRL_AUXSRC_PLL_SYS:
        return rp2040.pllSys.frequency;
      case CLK_SYS_CTRL_AUXSRC_PLL_USB:
        return rp2040.pllUsb.frequency;
      case CLK_SYS_CTRL_AUXSRC_ROSC:
        return rp2040.roscFreq;
      case CLK_SYS_CTRL_AUXSRC_XOSC:
        return rp2040.xoscFreq;
      default:
        return 0;
    }
  }
  readUint32(offset) {
    switch (offset) {
      case CLK_GPOUT0_CTRL:
        return this.gpout0Ctrl & 1252832;
      case CLK_GPOUT0_DIV:
        return this.gpout0Div;
      case CLK_GPOUT0_SELECTED:
        return 1;
      case CLK_GPOUT1_CTRL:
        return this.gpout1Ctrl & 1252832;
      case CLK_GPOUT1_DIV:
        return this.gpout1Div;
      case CLK_GPOUT1_SELECTED:
        return 1;
      case CLK_GPOUT2_CTRL:
        return this.gpout2Ctrl & 1252832;
      case CLK_GPOUT2_DIV:
        return this.gpout2Div;
      case CLK_GPOUT2_SELECTED:
        return 1;
      case CLK_GPOUT3_CTRL:
        return this.gpout3Ctrl & 1252832;
      case CLK_GPOUT3_DIV:
        return this.gpout3Div;
      case CLK_GPOUT3_SELECTED:
        return 1;
      case CLK_REF_CTRL:
        return this.refCtrl & 99;
      case CLK_REF_DIV:
        return this.refDiv & 48;
      // b8..9 = int divisor. no frac divisor present
      case CLK_REF_SELECTED:
        return 1 << (this.refCtrl & 3);
      case CLK_SYS_CTRL:
        return this.sysCtrl & 225;
      case CLK_SYS_DIV:
        return this.sysDiv;
      case CLK_SYS_SELECTED:
        return 1 << (this.sysCtrl & 1);
      case CLK_PERI_CTRL:
        return this.periCtrl & 3296;
      case CLK_PERI_DIV:
        return this.periDiv;
      case CLK_PERI_SELECTED:
        return 1;
      case CLK_USB_CTRL:
        return this.usbCtrl & 1248480;
      case CLK_USB_DIV:
        return this.usbDiv;
      case CLK_USB_SELECTED:
        return 1;
      case CLK_ADC_CTRL:
        return this.adcCtrl & 1248480;
      case CLK_ADC_DIV:
        return this.adcDiv & 48;
      case CLK_ADC_SELECTED:
        return 1;
      case CLK_RTC_CTRL:
        return this.rtcCtrl & 1248480;
      case CLK_RTC_DIV:
        return this.rtcDiv & 48;
      case CLK_RTC_SELECTED:
        return 1;
      case CLK_SYS_RESUS_CTRL:
        return 255;
      case CLK_SYS_RESUS_STATUS:
        return 0;
    }
    return super.readUint32(offset);
  }
  writeUint32(offset, value) {
    switch (offset) {
      case CLK_GPOUT0_CTRL:
        this.gpout0Ctrl = value;
        break;
      case CLK_GPOUT0_DIV:
        this.gpout0Div = value;
        break;
      case CLK_GPOUT1_CTRL:
        this.gpout1Ctrl = value;
        break;
      case CLK_GPOUT1_DIV:
        this.gpout1Div = value;
        break;
      case CLK_GPOUT2_CTRL:
        this.gpout2Ctrl = value;
        break;
      case CLK_GPOUT2_DIV:
        this.gpout2Div = value;
        break;
      case CLK_GPOUT3_CTRL:
        this.gpout3Ctrl = value;
        break;
      case CLK_GPOUT3_DIV:
        this.gpout3Div = value;
        break;
      case CLK_REF_CTRL:
        this.refCtrl = value, this.rp2040.updateClocks();
        break;
      case CLK_REF_DIV:
        this.refDiv = value, this.rp2040.updateClocks();
        break;
      case CLK_SYS_CTRL:
        this.sysCtrl = value, this.rp2040.updateClocks();
        break;
      case CLK_SYS_DIV:
        this.sysDiv = value, this.rp2040.updateClocks();
        break;
      case CLK_PERI_CTRL:
        this.periCtrl = value, this.rp2040.updateClocks();
        break;
      case CLK_PERI_DIV:
        this.periDiv = value;
        break;
      case CLK_USB_CTRL:
        this.usbCtrl = value;
        break;
      case CLK_USB_DIV:
        this.usbDiv = value;
        break;
      case CLK_ADC_CTRL:
        this.adcCtrl = value;
        break;
      case CLK_ADC_DIV:
        this.adcDiv = value;
        break;
      case CLK_RTC_CTRL:
        this.rtcCtrl = value;
        break;
      case CLK_RTC_DIV:
        this.rtcDiv = value;
        break;
      case CLK_SYS_RESUS_CTRL:
        return;
      /* clock resus not implemented */
      default:
        super.writeUint32(offset, value);
        break;
    }
  }
};

// node_modules/rp2040js/dist/esm/peripherals/i2c.js
var IC_CON = 0, IC_TAR = 4, IC_SAR = 8, IC_DATA_CMD = 16, IC_SS_SCL_HCNT = 20, IC_SS_SCL_LCNT = 24, IC_FS_SCL_HCNT = 28, IC_FS_SCL_LCNT = 32, IC_INTR_STAT = 44, IC_INTR_MASK = 48, IC_RAW_INTR_STAT = 52, IC_RX_TL = 56, IC_TX_TL = 60, IC_CLR_INTR = 64, IC_CLR_RX_UNDER = 68, IC_CLR_RX_OVER = 72, IC_CLR_TX_OVER = 76, IC_CLR_RD_REQ = 80, IC_CLR_TX_ABRT = 84, IC_CLR_RX_DONE = 88, IC_CLR_ACTIVITY = 92, IC_CLR_STOP_DET = 96, IC_CLR_START_DET = 100, IC_CLR_GEN_CALL = 104, IC_ENABLE = 108, IC_STATUS = 112, IC_TXFLR = 116, IC_RXFLR = 120, IC_SDA_HOLD = 124, IC_TX_ABRT_SOURCE = 128;
var IC_ENABLE_STATUS = 156, IC_FS_SPKLEN = 160;
var IC_COMP_PARAM_1 = 244, IC_COMP_VERSION = 248, IC_COMP_TYPE = 252;
var IC_SLAVE_DISABLE = 64, IC_RESTART_EN = 32, IC_10BITADDR_MASTER = 16;
var SPEED_SHIFT = 1, SPEED_MASK = 3, MASTER_MODE = 1;
var MST_ACTIVITY = 32, RFF = 16, RFNE = 8, TFE = 4, TFNF = 2, ACTIVITY = 1, TX_CMD_BLOCK = 4, ABORT = 2, ENABLE = 1, TX_FLUSH_CNT_MASK = 511, TX_FLUSH_CNT_SHIFT = 23, ABRT_USER_ABRT = 65536;
var ARB_LOST = 4096;
var ABRT_SBYTE_NORSTRT = 512;
var ABRT_GCALL_NOACK = 16, ABRT_TXDATA_NOACK = 8, ABRT_10ADDR2_NOACK = 4, ABRT_10ADDR1_NOACK = 2, ABRT_7B_ADDR_NOACK = 1, I2CMode;
(function(I2CMode2) {
  I2CMode2[I2CMode2.Write = 0] = "Write", I2CMode2[I2CMode2.Read = 1] = "Read";
})(I2CMode || (I2CMode = {}));
var I2CSpeed;
(function(I2CSpeed2) {
  I2CSpeed2[I2CSpeed2.Invalid = 0] = "Invalid", I2CSpeed2[I2CSpeed2.Standard = 1] = "Standard", I2CSpeed2[I2CSpeed2.FastMode = 2] = "FastMode", I2CSpeed2[I2CSpeed2.HighSpeedMode = 3] = "HighSpeedMode";
})(I2CSpeed || (I2CSpeed = {}));
var I2CState;
(function(I2CState2) {
  I2CState2[I2CState2.Idle = 0] = "Idle", I2CState2[I2CState2.Start = 1] = "Start", I2CState2[I2CState2.Connect = 2] = "Connect", I2CState2[I2CState2.Connected = 3] = "Connected", I2CState2[I2CState2.Stop = 4] = "Stop";
})(I2CState || (I2CState = {}));
var R_GEN_CALL = 2048, R_START_DET = 1024, R_STOP_DET = 512, R_ACTIVITY = 256, R_RX_DONE = 128, R_TX_ABRT = 64, R_RD_REQ = 32, R_TX_EMPTY = 16, R_TX_OVER = 8, R_RX_FULL = 4, R_RX_OVER = 2, R_RX_UNDER = 1, FIRST_DATA_BYTE = 1024, RESTART = 1024, STOP = 512, CMD = 256, RPI2C = class extends BasePeripheral {
  get intStatus() {
    return this.intRaw & this.intEnable;
  }
  get speed() {
    return this.control >> SPEED_SHIFT & SPEED_MASK;
  }
  get sclLowPeriod() {
    return this.speed === I2CSpeed.Standard ? this.ssClockLowPeriod : this.fsClockLowPeriod;
  }
  get sclHighPeriod() {
    return this.speed === I2CSpeed.Standard ? this.ssClockHighPeriod : this.fsClockHighPeriod;
  }
  get masterBits() {
    return this.control & IC_10BITADDR_MASTER ? 10 : 7;
  }
  constructor(rp2040, name, irq) {
    super(rp2040, name), this.irq = irq, this.state = I2CState.Idle, this.busy = !1, this.stop = !1, this.pendingRestart = !1, this.firstByte = !1, this.rxFIFO = new FIFO(16), this.txFIFO = new FIFO(16), this.onStart = () => this.completeStart(), this.onConnect = () => this.completeConnect(!1), this.onWriteByte = () => this.completeWrite(!1), this.onReadByte = () => this.completeRead(255), this.onStop = () => this.completeStop(), this.enable = 0, this.rxThreshold = 0, this.txThreshold = 0, this.control = IC_SLAVE_DISABLE | IC_RESTART_EN | I2CSpeed.FastMode << SPEED_SHIFT | MASTER_MODE, this.ssClockHighPeriod = 40, this.ssClockLowPeriod = 47, this.fsClockHighPeriod = 6, this.fsClockLowPeriod = 13, this.targetAddress = 85, this.slaveAddress = 85, this.abortSource = 0, this.intRaw = 0, this.intEnable = 0, this.spikelen = 7;
  }
  checkInterrupts() {
    this.rp2040.setInterrupt(this.irq, !!this.intStatus);
  }
  clearInterrupts(mask) {
    return this.intRaw & mask ? (this.intRaw &= ~mask, this.checkInterrupts(), 1) : 0;
  }
  setInterrupts(mask) {
    this.intRaw & mask || (this.intRaw |= mask, this.checkInterrupts());
  }
  abort(reason) {
    this.abortSource &= ~TX_FLUSH_CNT_MASK, this.abortSource |= reason | this.txFIFO.itemCount << TX_FLUSH_CNT_SHIFT, this.txFIFO.reset(), this.setInterrupts(R_TX_ABRT);
  }
  nextCommand() {
    let enabled = this.enable & ENABLE, blocked = this.enable & TX_CMD_BLOCK;
    if (this.txFIFO.empty || this.busy || blocked || !enabled)
      return;
    this.busy = !0;
    let restart = !!(this.txFIFO.peek() & RESTART) && !this.pendingRestart && !this.stop;
    if (this.state === I2CState.Idle || restart) {
      this.pendingRestart = restart, this.stop = !1, this.state = I2CState.Start, this.onStart(restart);
      return;
    }
    this.pendingRestart = !1;
    let cmd = this.txFIFO.pull(), readMode = !!(cmd & CMD);
    this.stop = !!(cmd & STOP), readMode ? this.onReadByte(!this.stop) : this.onWriteByte(cmd & 255), this.txFIFO.itemCount <= this.txThreshold && this.setInterrupts(R_TX_EMPTY);
  }
  pushRX(value) {
    if (this.rxFIFO.full) {
      this.setInterrupts(R_RX_OVER);
      return;
    }
    this.rxFIFO.push(value), this.rxFIFO.itemCount > this.rxThreshold && this.setInterrupts(R_RX_FULL);
  }
  completeStart() {
    if (this.txFIFO.empty || this.state !== I2CState.Start || this.stop) {
      this.onStop();
      return;
    }
    let mode = this.txFIFO.peek() & CMD ? I2CMode.Read : I2CMode.Write;
    this.state = I2CState.Connect, this.setInterrupts(R_START_DET);
    let addressMask = this.masterBits === 10 ? 1023 : 255;
    this.onConnect(this.targetAddress & addressMask, mode);
  }
  completeConnect(ack, nackByte = 0) {
    if (!ack || this.stop) {
      ack || (this.targetAddress ? this.control & IC_10BITADDR_MASTER ? this.abort(nackByte === 0 ? ABRT_10ADDR1_NOACK : ABRT_10ADDR2_NOACK) : this.abort(ABRT_7B_ADDR_NOACK) : this.abort(ABRT_GCALL_NOACK)), this.state = I2CState.Stop, this.onStop();
      return;
    }
    this.state = I2CState.Connected, this.busy = !1, this.firstByte = !0, this.nextCommand();
  }
  completeWrite(ack) {
    if (!ack || this.stop) {
      ack || this.abort(ABRT_TXDATA_NOACK), this.state = I2CState.Stop, this.onStop();
      return;
    }
    this.busy = !1, this.nextCommand();
  }
  completeRead(value) {
    if (this.pushRX(value | (this.firstByte ? FIRST_DATA_BYTE : 0)), this.stop) {
      this.state = I2CState.Stop, this.onStop();
      return;
    }
    this.firstByte = !1, this.busy = !1, this.nextCommand();
  }
  completeStop() {
    this.state = I2CState.Idle, this.setInterrupts(R_STOP_DET), this.busy = !1, this.pendingRestart = !1, this.enable & ABORT ? this.enable &= ~ABORT : this.nextCommand();
  }
  arbitrationLost() {
    this.state = I2CState.Idle, this.busy = !1, this.abort(ARB_LOST);
  }
  readUint32(offset) {
    switch (offset) {
      case IC_CON:
        return this.control;
      case IC_TAR:
        return this.targetAddress;
      case IC_SAR:
        return this.slaveAddress;
      case IC_DATA_CMD:
        return this.rxFIFO.empty ? (this.setInterrupts(R_RX_UNDER), 0) : (this.clearInterrupts(R_RX_FULL), this.rxFIFO.pull());
      case IC_SS_SCL_HCNT:
        return this.ssClockHighPeriod;
      case IC_SS_SCL_LCNT:
        return this.ssClockLowPeriod;
      case IC_FS_SCL_HCNT:
        return this.fsClockHighPeriod;
      case IC_FS_SCL_LCNT:
        return this.fsClockLowPeriod;
      case IC_INTR_STAT:
        return this.intStatus;
      case IC_INTR_MASK:
        return this.intEnable;
      case IC_RAW_INTR_STAT:
        return this.intRaw;
      case IC_RX_TL:
        return this.rxThreshold;
      case IC_TX_TL:
        return this.txThreshold;
      case IC_CLR_INTR:
        return this.abortSource &= ABRT_SBYTE_NORSTRT, this.clearInterrupts(R_RX_UNDER | R_RX_OVER | R_TX_OVER | R_RD_REQ | R_TX_ABRT | R_RX_DONE | R_ACTIVITY | R_STOP_DET | R_START_DET | R_GEN_CALL);
      case IC_CLR_RX_UNDER:
        return this.clearInterrupts(R_RX_UNDER);
      case IC_CLR_RX_OVER:
        return this.clearInterrupts(R_RX_OVER);
      case IC_CLR_TX_OVER:
        return this.clearInterrupts(R_TX_OVER);
      case IC_CLR_RD_REQ:
        return this.clearInterrupts(R_RD_REQ);
      case IC_CLR_TX_ABRT:
        return this.abortSource &= ABRT_SBYTE_NORSTRT, this.clearInterrupts(R_TX_ABRT);
      case IC_CLR_RX_DONE:
        return this.clearInterrupts(R_RX_DONE);
      case IC_CLR_ACTIVITY:
        return this.clearInterrupts(R_ACTIVITY);
      case IC_CLR_STOP_DET:
        return this.clearInterrupts(R_STOP_DET);
      case IC_CLR_START_DET:
        return this.clearInterrupts(R_START_DET);
      case IC_CLR_GEN_CALL:
        return this.clearInterrupts(R_GEN_CALL);
      case IC_ENABLE:
        return this.enable;
      case IC_STATUS:
        return (this.state !== I2CState.Idle ? MST_ACTIVITY | ACTIVITY : 0) | (this.rxFIFO.full ? RFF : 0) | (this.rxFIFO.empty ? 0 : RFNE) | (this.txFIFO.empty ? TFE : 0) | (this.txFIFO.full ? 0 : TFNF);
      case IC_TXFLR:
        return this.txFIFO.itemCount;
      case IC_RXFLR:
        return this.rxFIFO.itemCount;
      case IC_SDA_HOLD:
        return 1;
      case IC_TX_ABRT_SOURCE: {
        let value = this.abortSource;
        return this.abortSource &= ABRT_SBYTE_NORSTRT, value;
      }
      case IC_ENABLE_STATUS:
        return this.enable & 1;
      case IC_FS_SPKLEN:
        return this.spikelen & 255;
      case IC_COMP_PARAM_1:
        return 0;
      case IC_COMP_VERSION:
        return 842019114;
      case IC_COMP_TYPE:
        return 1146552640;
    }
    return super.readUint32(offset);
  }
  writeUint32(offset, value) {
    switch (offset) {
      case IC_CON:
        (value >> SPEED_SHIFT & SPEED_MASK) === I2CSpeed.Invalid && (value = value & ~(SPEED_MASK << SPEED_SHIFT) | I2CSpeed.HighSpeedMode << SPEED_SHIFT), this.control = value;
        return;
      case IC_TAR:
        this.targetAddress = value & 1023;
        return;
      case IC_SAR:
        this.slaveAddress = value & 1023;
        return;
      case IC_DATA_CMD:
        this.txFIFO.full ? this.setInterrupts(R_TX_OVER) : (this.txFIFO.push(value), this.clearInterrupts(R_TX_EMPTY), this.nextCommand());
        return;
      case IC_SS_SCL_HCNT:
        this.ssClockHighPeriod = value & 65535;
        return;
      case IC_SS_SCL_LCNT:
        this.ssClockLowPeriod = value & 65535;
        return;
      case IC_FS_SCL_HCNT:
        this.fsClockHighPeriod = value & 65535;
        return;
      case IC_FS_SCL_LCNT:
        this.fsClockLowPeriod = value & 65535;
        return;
      case IC_SDA_HOLD:
        value & ENABLE || value != 1 && this.warn("Unimplemented write to IC_SDA_HOLD");
        return;
      case IC_RX_TL:
        this.rxThreshold = value & 255, this.rxThreshold > this.rxFIFO.size && (this.rxThreshold = this.rxFIFO.size);
        return;
      case IC_TX_TL:
        this.txThreshold = value & 255, this.txThreshold > this.txFIFO.size && (this.txThreshold = this.txFIFO.size);
        return;
      case IC_ENABLE:
        value |= this.enable & ABORT, value & ABORT && (this.state === I2CState.Idle ? value &= ~ABORT : (this.abort(ABRT_USER_ABRT), this.stop = !0)), value & ENABLE || (this.txFIFO.reset(), this.rxFIFO.reset()), this.enable = value, this.nextCommand();
        return;
      case IC_FS_SPKLEN:
        !(value & ENABLE) && value > 0 && (this.spikelen = value);
        return;
      default:
        super.writeUint32(offset, value);
    }
  }
};

// node_modules/rp2040js/dist/esm/peripherals/io.js
var GPIO_CTRL_LAST = 236, INTR0 = 240, PROC0_INTE0 = 256, PROC0_INTF0 = 272, PROC0_INTS0 = 288, PROC0_INTS3 = 300, RPIO = class extends BasePeripheral {
  constructor(rp2040, name) {
    super(rp2040, name);
  }
  getPinFromOffset(offset) {
    let gpioIndex = offset >>> 3;
    return {
      gpio: this.rp2040.gpio[gpioIndex],
      isCtrl: !!(offset & 4)
    };
  }
  readUint32(offset) {
    if (offset <= GPIO_CTRL_LAST) {
      let { gpio, isCtrl } = this.getPinFromOffset(offset);
      return isCtrl ? gpio.ctrl : gpio.status;
    }
    if (offset >= INTR0 && offset <= PROC0_INTS3) {
      let startIndex = (offset & 15) * 2, register = offset & -16, { gpio } = this.rp2040, result = 0;
      for (let index = 7; index >= 0; index--) {
        let pin = gpio[index + startIndex];
        if (pin)
          switch (result <<= 4, register) {
            case INTR0:
              result |= pin.irqStatus;
              break;
            case PROC0_INTE0:
              result |= pin.irqEnableMask;
              break;
            case PROC0_INTF0:
              result |= pin.irqForceMask;
              break;
            case PROC0_INTS0:
              result |= pin.irqStatus & pin.irqEnableMask | pin.irqForceMask;
              break;
          }
      }
      return result;
    }
    return super.readUint32(offset);
  }
  writeUint32(offset, value) {
    if (offset <= GPIO_CTRL_LAST) {
      let { gpio, isCtrl } = this.getPinFromOffset(offset);
      isCtrl && (gpio.ctrl = value, gpio.checkForUpdates());
      return;
    }
    if (offset >= INTR0 && offset <= PROC0_INTS3) {
      let startIndex = (offset & 15) * 2, register = offset & -16, { gpio } = this.rp2040;
      for (let index = 0; index < 8; index++) {
        let pin = gpio[index + startIndex];
        if (!pin)
          continue;
        let pinValue = value >> index * 4 & 15, pinRawWriteValue = this.rawWriteValue >> index * 4 & 15;
        switch (register) {
          case INTR0:
            pin.updateIRQValue(pinRawWriteValue);
            break;
          case PROC0_INTE0:
            pin.irqEnableMask !== pinValue && (pin.irqEnableMask = pinValue, this.rp2040.updateIOInterrupt());
            break;
          case PROC0_INTF0:
            pin.irqForceMask !== pinValue && (pin.irqForceMask = pinValue, this.rp2040.updateIOInterrupt());
            break;
        }
      }
      return;
    }
    super.writeUint32(offset, value);
  }
};

// node_modules/rp2040js/dist/esm/peripherals/pads.js
var VOLTAGE_SELECT = 0, GPIO_FIRST = 4, GPIO_LAST = 120, QSPI_FIRST = 4, QSPI_LAST = 24, RPPADS = class extends BasePeripheral {
  constructor(rp2040, name, bank) {
    super(rp2040, name), this.bank = bank, this.voltageSelect = 0, this.firstPadRegister = this.bank === "qspi" ? QSPI_FIRST : GPIO_FIRST, this.lastPadRegister = this.bank === "qspi" ? QSPI_LAST : GPIO_LAST;
  }
  getPinFromOffset(offset) {
    let gpioIndex = offset - this.firstPadRegister >>> 2;
    return this.bank === "qspi" ? this.rp2040.qspi[gpioIndex] : this.rp2040.gpio[gpioIndex];
  }
  readUint32(offset) {
    if (offset >= this.firstPadRegister && offset <= this.lastPadRegister)
      return this.getPinFromOffset(offset).padValue;
    switch (offset) {
      case VOLTAGE_SELECT:
        return this.voltageSelect;
    }
    return super.readUint32(offset);
  }
  writeUint32(offset, value) {
    if (offset >= this.firstPadRegister && offset <= this.lastPadRegister) {
      let gpio = this.getPinFromOffset(offset), oldInputEnable = gpio.inputEnable;
      gpio.padValue = value, gpio.checkForUpdates(), oldInputEnable !== gpio.inputEnable && gpio.refreshInput();
      return;
    }
    switch (offset) {
      case VOLTAGE_SELECT:
        this.voltageSelect = value & 1;
        break;
      default:
        super.writeUint32(offset, value);
    }
  }
};

// node_modules/rp2040js/dist/esm/peripherals/pll.js
var PLL_CS = 0, PLL_PWR = 4, PLL_FBDIV_INT = 8, PLL_PRIM = 12, PLL_CS_LOCK = 1 << 31, PLL_CS_BYPASS = 256, PLL_CS_REFDIV_MASK = 63, PLL_FBDIV_INT_MASK = 4095, PLL_PRIM_POSTDIV1_SHIFT = 16, PLL_PRIM_POSTDIV2_SHIFT = 12, PLL_PRIM_POSTDIV_MASK = 7, RPPLL = class extends BasePeripheral {
  constructor() {
    super(...arguments), this.cs = 1, this.pwr = 45, this.fbdivInt = 0, this.prim = 487424;
  }
  get refdiv() {
    return this.cs & PLL_CS_REFDIV_MASK;
  }
  get fbdiv() {
    return this.fbdivInt & PLL_FBDIV_INT_MASK;
  }
  get postdiv1() {
    return this.prim >>> PLL_PRIM_POSTDIV1_SHIFT & PLL_PRIM_POSTDIV_MASK;
  }
  get postdiv2() {
    return this.prim >>> PLL_PRIM_POSTDIV2_SHIFT & PLL_PRIM_POSTDIV_MASK;
  }
  /** PLL output frequency, in Hz, derived from the current register values. */
  get frequency() {
    let refFreq = this.rp2040.xoscFreq / (this.refdiv || 1);
    if (this.cs & PLL_CS_BYPASS)
      return refFreq;
    let postdiv = (this.postdiv1 || 1) * (this.postdiv2 || 1);
    return refFreq * this.fbdiv / postdiv;
  }
  readUint32(offset) {
    switch (offset) {
      case PLL_CS:
        return this.cs | PLL_CS_LOCK;
      case PLL_PWR:
        return this.pwr;
      case PLL_FBDIV_INT:
        return this.fbdivInt;
      case PLL_PRIM:
        return this.prim;
      default:
        return super.readUint32(offset);
    }
  }
  writeUint32(offset, value) {
    switch (offset) {
      case PLL_CS:
        this.cs = value;
        break;
      case PLL_PWR:
        this.pwr = value;
        break;
      case PLL_FBDIV_INT:
        this.fbdivInt = value;
        break;
      case PLL_PRIM:
        this.prim = value;
        break;
      default:
        super.writeUint32(offset, value);
        return;
    }
    this.rp2040.updateClocks();
  }
};

// node_modules/rp2040js/dist/esm/utils/timer32.js
var TimerMode;
(function(TimerMode2) {
  TimerMode2[TimerMode2.Increment = 0] = "Increment", TimerMode2[TimerMode2.Decrement = 1] = "Decrement", TimerMode2[TimerMode2.ZigZag = 2] = "ZigZag";
})(TimerMode || (TimerMode = {}));
var Timer32 = class {
  constructor(clock, baseFreq) {
    this.clock = clock, this.baseFreq = baseFreq, this.baseValue = 0, this.baseNanos = 0, this.topValue = 4294967295, this.prescalerValue = 1, this.timerMode = TimerMode.Increment, this.enabled = !0, this.listeners = [];
  }
  reset() {
    this.baseNanos = this.clock.nanos, this.baseValue = 0, this.updated();
  }
  set(value, zigZagDown = !1) {
    this.baseValue = zigZagDown ? this.topValue * 2 - value : value, this.baseNanos = this.clock.nanos, this.updated();
  }
  /**
   * Advances the counter by the given amount. Note that this will
   * decrease the counter if the timer is running in Decrement mode.
   *
   * @param delta The value to add to the counter. Can be negative.
   */
  advance(delta) {
    if (this.baseValue += delta, this.topValue !== 4294967295) {
      let topModulo = this.timerMode === TimerMode.ZigZag ? this.topValue * 2 : this.topValue + 1;
      this.baseValue = (this.baseValue % topModulo + topModulo) % topModulo;
    }
    this.updated();
  }
  get rawCounter() {
    let { baseFreq, prescalerValue, baseNanos, baseValue, enabled, timerMode } = this;
    if (!baseFreq || !prescalerValue || !enabled)
      return this.baseValue;
    let zigzag = timerMode == TimerMode.ZigZag, ticks = (this.clock.nanos - baseNanos) / 1e9 * (baseFreq / prescalerValue), topModulo = zigzag ? this.topValue * 2 : this.topValue + 1, delta = timerMode == TimerMode.Decrement ? topModulo - ticks % topModulo : ticks, currentValue = Math.round(baseValue + delta);
    return this.topValue != 4294967295 && (currentValue %= topModulo), currentValue;
  }
  get counter() {
    let currentValue = this.rawCounter;
    return this.timerMode == TimerMode.ZigZag && currentValue > this.topValue && (currentValue = this.topValue * 2 - currentValue), currentValue >>> 0;
  }
  get top() {
    return this.topValue;
  }
  set top(value) {
    let { counter } = this;
    this.topValue = value, this.set(counter <= this.topValue ? counter : 0);
  }
  get frequency() {
    return this.baseFreq;
  }
  set frequency(value) {
    this.baseValue = this.counter, this.baseNanos = this.clock.nanos, this.baseFreq = value, this.updated();
  }
  get prescaler() {
    return this.prescalerValue;
  }
  set prescaler(value) {
    this.baseValue = this.counter, this.baseNanos = this.clock.nanos, this.enabled = this.prescalerValue !== 0, this.prescalerValue = value, this.updated();
  }
  toNanos(cycles) {
    let { baseFreq, prescalerValue } = this;
    return cycles * 1e9 / (baseFreq / prescalerValue);
  }
  get enable() {
    return this.enabled;
  }
  set enable(value) {
    value !== this.enabled && (value ? this.baseNanos = this.clock.nanos : this.baseValue = this.counter, this.enabled = value, this.updated());
  }
  get mode() {
    return this.timerMode;
  }
  set mode(value) {
    if (this.timerMode !== value) {
      let { counter } = this;
      this.timerMode = value, this.set(counter);
    }
  }
  updated() {
    for (let listener of this.listeners)
      listener();
  }
}, Timer32PeriodicAlarm = class {
  constructor(timer, callback) {
    this.timer = timer, this.callback = callback, this.targetValue = 0, this.enabled = !1, this.handleAlarm = () => {
      this.callback(), this.enabled && this.timer.enable && this.schedule();
    }, this.update = () => {
      this.cancel(), this.enabled && this.timer.enable && this.schedule();
    }, this.clockAlarm = this.timer.clock.createAlarm(this.handleAlarm), timer.listeners.push(this.update);
  }
  get enable() {
    return this.enabled;
  }
  set enable(value) {
    value !== this.enabled && (this.enabled = value, value && this.timer.enable ? this.schedule() : this.cancel());
  }
  get target() {
    return this.targetValue;
  }
  set target(value) {
    value !== this.targetValue && (this.targetValue = value, this.enabled && this.timer.enable && (this.cancel(), this.schedule()));
  }
  schedule() {
    let { timer, targetValue } = this, { top, mode, rawCounter } = timer, cycleDelta = targetValue - rawCounter;
    if (mode === TimerMode.ZigZag && cycleDelta < 0 && (cycleDelta < -top ? cycleDelta += 2 * top : cycleDelta = top * 2 - targetValue - rawCounter), top != 4294967295 && (cycleDelta <= 0 && (cycleDelta += top + 1), targetValue > top))
      return;
    mode === TimerMode.Decrement && (cycleDelta = top + 1 - cycleDelta);
    let cyclesToAlarm = cycleDelta >>> 0, nanosToAlarm = timer.toNanos(cyclesToAlarm);
    this.clockAlarm.schedule(nanosToAlarm);
  }
  cancel() {
    this.clockAlarm.cancel();
  }
};

// node_modules/rp2040js/dist/esm/peripherals/ppb.js
var CPUID = 3328, ICSR = 3332, VTOR = 3336, SHPR2 = 3356, SHPR3 = 3360, SYST_CSR = 16, SYST_RVR = 20, SYST_CVR = 24, SYST_CALIB = 28, NVIC_ISER = 256, NVIC_ICER = 384, NVIC_ISPR = 512, NVIC_ICPR = 640, NVIC_IPR0 = 1024, NVIC_IPR1 = 1028, NVIC_IPR2 = 1032, NVIC_IPR3 = 1036, NVIC_IPR4 = 1040, NVIC_IPR5 = 1044, NVIC_IPR6 = 1048, NVIC_IPR7 = 1052, NMIPENDSET = 1 << 31, PENDSVSET = 1 << 28, PENDSVCLR = 1 << 27, PENDSTSET = 1 << 26, PENDSTCLR = 1 << 25, ISRPREEMPT = 1 << 23, ISRPENDING = 1 << 22;
var VECTPENDING_SHIFT = 12, VECTACTIVE_MASK = 511, VECTACTIVE_SHIFT = 0, RPPPB = class extends BasePeripheral {
  constructor(rp2040, name) {
    super(rp2040, name), this.systickCountFlag = !1, this.systickClkSource = !1, this.systickIntEnable = !1, this.systickReload = 0, this.systickTimer = new Timer32(this.rp2040.clock, this.rp2040.clkSys), this.systickAlarm = new Timer32PeriodicAlarm(this.systickTimer, () => {
      this.systickCountFlag = !0, this.systickIntEnable && (this.rp2040.core.pendingSystick = !0, this.rp2040.core.interruptsUpdated = !0), this.systickTimer.set(this.systickReload);
    }), this.systickTimer.top = 16777215, this.systickTimer.mode = TimerMode.Decrement, this.systickAlarm.target = 0, this.systickAlarm.enable = !0, this.reset();
  }
  reset() {
    this.writeUint32(SYST_CSR, 0), this.writeUint32(SYST_RVR, 16777215), this.systickTimer.set(16777215);
  }
  readUint32(offset) {
    let { rp2040 } = this, { core } = rp2040;
    switch (offset) {
      case CPUID:
        return 1091356161;
      /* Verified against actual hardware */
      case ICSR: {
        let pendingInterrupts = core.pendingInterrupts || core.pendingPendSV || core.pendingSystick || core.pendingSVCall, vectPending = core.vectPending;
        return (core.pendingNMI ? NMIPENDSET : 0) | (core.pendingPendSV ? PENDSVSET : 0) | (core.pendingSystick ? PENDSTSET : 0) | (pendingInterrupts ? ISRPENDING : 0) | vectPending << VECTPENDING_SHIFT | (core.IPSR & VECTACTIVE_MASK) << VECTACTIVE_SHIFT;
      }
      case VTOR:
        return core.VTOR;
      /* NVIC */
      case NVIC_ISPR:
        return core.pendingInterrupts >>> 0;
      case NVIC_ICPR:
        return core.pendingInterrupts >>> 0;
      case NVIC_ISER:
        return core.enabledInterrupts >>> 0;
      case NVIC_ICER:
        return core.enabledInterrupts >>> 0;
      case NVIC_IPR0:
      case NVIC_IPR1:
      case NVIC_IPR2:
      case NVIC_IPR3:
      case NVIC_IPR4:
      case NVIC_IPR5:
      case NVIC_IPR6:
      case NVIC_IPR7: {
        let regIndex = offset - NVIC_IPR0 >> 2, result = 0;
        for (let byteIndex = 0; byteIndex < 4; byteIndex++) {
          let interruptNumber = regIndex * 4 + byteIndex;
          for (let priority = 0; priority < core.interruptPriorities.length; priority++)
            core.interruptPriorities[priority] & 1 << interruptNumber && (result |= priority << 8 * byteIndex + 6);
        }
        return result;
      }
      case SHPR2:
        return core.SHPR2;
      case SHPR3:
        return core.SHPR3;
      /* SysTick */
      case SYST_CSR: {
        let countFlagValue = this.systickCountFlag ? 65536 : 0, clkSourceValue = this.systickClkSource ? 4 : 0, tickIntValue = this.systickIntEnable ? 2 : 0, enableFlagValue = this.systickTimer.enable ? 1 : 0;
        return this.systickCountFlag = !1, countFlagValue | clkSourceValue | tickIntValue | enableFlagValue;
      }
      case SYST_CVR:
        return this.systickTimer.counter;
      case SYST_RVR:
        return this.systickReload;
      case SYST_CALIB:
        return 9999;
    }
    return super.readUint32(offset);
  }
  writeUint32(offset, value) {
    let { rp2040 } = this, { core } = rp2040, hardwareInterruptMask = (1 << MAX_HARDWARE_IRQ) - 1;
    switch (offset) {
      case ICSR:
        value & NMIPENDSET && (core.pendingNMI = !0, core.interruptsUpdated = !0), value & PENDSVSET && (core.pendingPendSV = !0, core.interruptsUpdated = !0), value & PENDSVCLR && (core.pendingPendSV = !1), value & PENDSTSET && (core.pendingSystick = !0, core.interruptsUpdated = !0), value & PENDSTCLR && (core.pendingSystick = !1);
        return;
      case VTOR:
        core.VTOR = value;
        return;
      /* NVIC */
      case NVIC_ISPR:
        core.pendingInterrupts |= value, core.interruptsUpdated = !0;
        return;
      case NVIC_ICPR:
        core.pendingInterrupts &= ~value | hardwareInterruptMask;
        return;
      case NVIC_ISER:
        core.enabledInterrupts |= value, core.interruptsUpdated = !0;
        return;
      case NVIC_ICER:
        core.enabledInterrupts &= ~value;
        return;
      case NVIC_IPR0:
      case NVIC_IPR1:
      case NVIC_IPR2:
      case NVIC_IPR3:
      case NVIC_IPR4:
      case NVIC_IPR5:
      case NVIC_IPR6:
      case NVIC_IPR7: {
        let regIndex = offset - NVIC_IPR0 >> 2;
        for (let byteIndex = 0; byteIndex < 4; byteIndex++) {
          let interruptNumber = regIndex * 4 + byteIndex, newPriority = value >> 8 * byteIndex + 6 & 3;
          for (let priority = 0; priority < core.interruptPriorities.length; priority++)
            core.interruptPriorities[priority] &= ~(1 << interruptNumber);
          core.interruptPriorities[newPriority] |= 1 << interruptNumber;
        }
        core.interruptsUpdated = !0;
        return;
      }
      case SHPR2:
        core.SHPR2 = value;
        return;
      case SHPR3:
        core.SHPR3 = value;
        return;
      // SysTick
      case SYST_CSR:
        this.systickClkSource = !!(value & 4), this.systickIntEnable = !!(value & 2), this.systickTimer.enable = !!(value & 1);
        return;
      case SYST_CVR:
        this.systickTimer.set(0);
        return;
      case SYST_RVR:
        this.systickReload = value;
        return;
      default:
        super.writeUint32(offset, value);
    }
  }
};

// node_modules/rp2040js/dist/esm/peripherals/psm.js
var FRCE_ON = 0, FRCE_OFF = 4, WDSEL = 8, DONE = 12, PSM_BITS_MASK = 131071, RPPSM = class extends BasePeripheral {
  constructor() {
    super(...arguments), this.frceOn = 0, this.frceOff = 0, this.wdsel = 0;
  }
  readUint32(offset) {
    switch (offset) {
      case FRCE_ON:
        return this.frceOn;
      case FRCE_OFF:
        return this.frceOff;
      case WDSEL:
        return this.wdsel;
      case DONE:
        return PSM_BITS_MASK & ~this.frceOff | this.frceOn & this.frceOff;
    }
    return super.readUint32(offset);
  }
  writeUint32(offset, value) {
    switch (offset) {
      case FRCE_ON:
        this.frceOn = value & PSM_BITS_MASK;
        break;
      case FRCE_OFF:
        this.frceOff = value & PSM_BITS_MASK;
        break;
      case WDSEL:
        this.wdsel = value & PSM_BITS_MASK;
        break;
      default:
        super.writeUint32(offset, value);
        break;
    }
  }
};

// node_modules/rp2040js/dist/esm/peripherals/pwm.js
var CHn_CSR = 0, CHn_DIV = 4, CHn_CTR = 8, CHn_CC = 12, CHn_TOP = 16, EN2 = 160, INTR4 = 164, INTE2 = 168, INTF2 = 172, INTS2 = 176, INT_MASK = 255, CSR_PH_ADV = 128, CSR_PH_RET = 64, CSR_DIVMODE_SHIFT = 4, CSR_DIVMODE_MASK = 3, CSR_B_INV = 8, CSR_A_INV = 4, CSR_PH_CORRECT = 2, CSR_EN = 1, PWMDivMode;
(function(PWMDivMode2) {
  PWMDivMode2[PWMDivMode2.FreeRunning = 0] = "FreeRunning", PWMDivMode2[PWMDivMode2.BGated = 1] = "BGated", PWMDivMode2[PWMDivMode2.BRisingEdge = 2] = "BRisingEdge", PWMDivMode2[PWMDivMode2.BFallingEdge = 3] = "BFallingEdge";
})(PWMDivMode || (PWMDivMode = {}));
var PWMChannel = class {
  constructor(pwm, clock, index) {
    this.pwm = pwm, this.clock = clock, this.index = index, this.timer = new Timer32(this.clock, this.pwm.clockFreq), this.alarmA = new Timer32PeriodicAlarm(this.timer, () => {
      this.setA(!1);
    }), this.alarmB = new Timer32PeriodicAlarm(this.timer, () => {
      this.setB(!1);
    }), this.alarmBottom = new Timer32PeriodicAlarm(this.timer, () => this.wrap()), this.csr = 0, this.div = 0, this.cc = 0, this.top = 0, this.lastBValue = !1, this.countingUp = !0, this.ccUpdated = !1, this.topUpdated = !1, this.tickCounter = 0, this.divMode = PWMDivMode.FreeRunning, this.pinA1 = this.index * 2, this.pinB1 = this.index * 2 + 1, this.pinA2 = this.index < 7 ? 16 + this.index * 2 : -1, this.pinB2 = this.index < 7 ? 16 + this.index * 2 + 1 : -1, this.alarmA.enable = !0, this.alarmB.enable = !0, this.alarmBottom.enable = !0;
  }
  readRegister(offset) {
    switch (offset) {
      case CHn_CSR:
        return this.csr;
      case CHn_DIV:
        return this.div;
      case CHn_CTR:
        return this.timer.counter;
      case CHn_CC:
        return this.cc;
      case CHn_TOP:
        return this.top;
    }
    return 0;
  }
  writeRegister(offset, value) {
    switch (offset) {
      case CHn_CSR:
        value & CSR_EN && !(this.csr & CSR_EN) && this.updateDoubleBuffered(), this.csr = value & ~(CSR_PH_ADV | CSR_PH_RET), value & CSR_EN && (value & CSR_PH_ADV && this.timer.advance(1), value & CSR_PH_RET && this.timer.advance(-1)), this.divMode = this.csr >> CSR_DIVMODE_SHIFT & CSR_DIVMODE_MASK, this.setBDirection(this.divMode === PWMDivMode.FreeRunning), this.updateEnable(), this.lastBValue = this.gpioBValue, this.timer.mode = value & CSR_PH_CORRECT ? TimerMode.ZigZag : TimerMode.Increment;
        break;
      case CHn_DIV: {
        this.div = value & 1048575;
        let intValue = value >> 4 & 255, fracValue = value & 15;
        this.timer.prescaler = (intValue || 256) + fracValue / 16;
        break;
      }
      case CHn_CTR:
        this.timer.set(value & 65535);
        break;
      case CHn_CC:
        this.cc = value, this.ccUpdated = !0;
        break;
      case CHn_TOP:
        this.top = value & 65535, this.topUpdated = !0;
        break;
    }
  }
  reset() {
    this.writeRegister(CHn_CSR, 0), this.writeRegister(CHn_DIV, 16), this.writeRegister(CHn_CTR, 0), this.writeRegister(CHn_CC, 0), this.writeRegister(CHn_TOP, 65535), this.countingUp = !0, this.timer.enable = !1, this.timer.reset();
  }
  updateDoubleBuffered() {
    this.ccUpdated && (this.alarmB.target = this.cc >>> 16, this.alarmA.target = this.cc & 65535, this.ccUpdated = !1), this.topUpdated && (this.timer.top = this.top, this.topUpdated = !1);
  }
  wrap() {
    this.pwm.channelInterrupt(this.index), this.updateDoubleBuffered(), this.csr & CSR_PH_CORRECT || (this.setA(this.alarmA.target > 0), this.setB(this.alarmB.target > 0));
  }
  setA(value) {
    this.csr & CSR_A_INV && (value = !value), this.pwm.gpioSet(this.pinA1, value), this.pinA2 >= 0 && this.pwm.gpioSet(this.pinA2, value);
  }
  setB(value) {
    this.csr & CSR_B_INV && (value = !value), this.pwm.gpioSet(this.pinB1, value), this.pinB2 >= 0 && this.pwm.gpioSet(this.pinB2, value);
  }
  get gpioBValue() {
    return this.pwm.gpioRead(this.pinB1) || (this.pinB2 > 0 ? this.pwm.gpioRead(this.pinB2) : !1);
  }
  setBDirection(value) {
    this.pwm.gpioSetDir(this.pinB1, value), this.pinB2 >= 0 && this.pwm.gpioSetDir(this.pinB2, value);
  }
  gpioBChanged() {
    let value = this.gpioBValue;
    if (value !== this.lastBValue) {
      switch (this.lastBValue = value, this.divMode) {
        case PWMDivMode.BGated:
          this.updateEnable();
          break;
        case PWMDivMode.BRisingEdge:
          value && this.tickCounter++;
          break;
        case PWMDivMode.BFallingEdge:
          value || this.tickCounter++;
          break;
      }
      this.tickCounter >= this.timer.prescaler && (this.timer.advance(1), this.tickCounter -= this.timer.prescaler);
    }
  }
  updateEnable() {
    let { csr, divMode } = this, enable = !!(csr & CSR_EN);
    this.timer.enable = enable && (divMode === PWMDivMode.FreeRunning || divMode === PWMDivMode.BGated && this.gpioBValue);
  }
  set en(value) {
    value && !(this.csr & CSR_EN) && this.updateDoubleBuffered(), value ? this.csr |= CSR_EN : this.csr &= ~CSR_EN, this.updateEnable();
  }
}, RPPWM = class extends BasePeripheral {
  constructor() {
    super(...arguments), this.channels = [
      new PWMChannel(this, this.rp2040.clock, 0),
      new PWMChannel(this, this.rp2040.clock, 1),
      new PWMChannel(this, this.rp2040.clock, 2),
      new PWMChannel(this, this.rp2040.clock, 3),
      new PWMChannel(this, this.rp2040.clock, 4),
      new PWMChannel(this, this.rp2040.clock, 5),
      new PWMChannel(this, this.rp2040.clock, 6),
      new PWMChannel(this, this.rp2040.clock, 7)
    ], this.intRaw = 0, this.intEnable = 0, this.intForce = 0, this.gpioValue = 0, this.gpioDirection = 0;
  }
  get intStatus() {
    return this.intRaw & this.intEnable | this.intForce;
  }
  readUint32(offset) {
    if (offset < EN2) {
      let channel = Math.floor(offset / 20);
      return this.channels[channel].readRegister(offset % 20);
    }
    switch (offset) {
      case EN2:
        return this.channels[7].en << 7 | this.channels[6].en << 6 | this.channels[5].en << 5 | this.channels[4].en << 4 | this.channels[3].en << 3 | this.channels[2].en << 2 | this.channels[1].en << 1 | this.channels[0].en << 0;
      case INTR4:
        return this.intRaw;
      case INTE2:
        return this.intEnable;
      case INTF2:
        return this.intForce;
      case INTS2:
        return this.intStatus;
    }
    return super.readUint32(offset);
  }
  writeUint32(offset, value) {
    if (offset < EN2) {
      let channel = Math.floor(offset / 20);
      return this.channels[channel].writeRegister(offset % 20, value);
    }
    switch (offset) {
      case EN2:
        this.channels[7].en = value & 128, this.channels[6].en = value & 64, this.channels[5].en = value & 32, this.channels[4].en = value & 16, this.channels[3].en = value & 8, this.channels[2].en = value & 4, this.channels[1].en = value & 2, this.channels[0].en = value & 1;
        break;
      case INTR4:
        this.intRaw &= ~(value & INT_MASK), this.checkInterrupts();
        break;
      case INTE2:
        this.intEnable = value & INT_MASK, this.checkInterrupts();
        break;
      case INTF2:
        this.intForce = value & INT_MASK, this.checkInterrupts();
        break;
      default:
        super.writeUint32(offset, value);
    }
  }
  get clockFreq() {
    return this.rp2040.clkSys;
  }
  channelInterrupt(index) {
    this.intRaw |= 1 << index, this.checkInterrupts(), this.rp2040.dma.setDREQ(DREQChannel.DREQ_PWM_WRAP0 + index);
  }
  checkInterrupts() {
    this.rp2040.setInterrupt(IRQ.PWM_WRAP, !!this.intStatus);
  }
  gpioSet(index, value) {
    let bit = 1 << index, newGpioValue = value ? this.gpioValue | bit : this.gpioValue & ~bit;
    this.gpioValue != newGpioValue && (this.gpioValue = newGpioValue, this.rp2040.gpio[index].checkForUpdates());
  }
  gpioSetDir(index, output) {
    let bit = 1 << index, newGpioDirection = output ? this.gpioDirection | bit : this.gpioDirection & ~bit;
    this.gpioDirection != newGpioDirection && (this.gpioDirection = newGpioDirection, this.rp2040.gpio[index].checkForUpdates());
  }
  gpioRead(index) {
    return this.rp2040.gpio[index].inputValue;
  }
  gpioOnInput(index) {
    if (!(this.gpioDirection && 1 << index))
      for (let channel of this.channels)
        (channel.pinB1 === index || channel.pinB2 === index) && channel.gpioBChanged();
  }
  reset() {
    this.gpioDirection = 4294967295;
    for (let channel of this.channels)
      channel.reset();
  }
};

// node_modules/rp2040js/dist/esm/peripherals/reset.js
var RESET = 0, WDSEL2 = 4, RESET_DONE = 8, RPReset = class extends BasePeripheral {
  constructor() {
    super(...arguments), this.reset = 0, this.wdsel = 0, this.reset_done = 33554431;
  }
  readUint32(offset) {
    switch (offset) {
      case RESET:
        return this.reset;
      case WDSEL2:
        return this.wdsel;
      case RESET_DONE:
        return this.reset_done;
    }
    return super.readUint32(offset);
  }
  writeUint32(offset, value) {
    switch (offset) {
      case RESET:
        this.reset = value & 33554431;
        break;
      case WDSEL2:
        this.wdsel = value & 33554431;
        break;
      default:
        super.writeUint32(offset, value);
        break;
    }
  }
};

// node_modules/rp2040js/dist/esm/peripherals/rtc.js
var RTC_SETUP0 = 4, RTC_SETUP1 = 8, RTC_CTRL = 12, IRQ_SETUP_0 = 16, RTC_RTC1 = 24, RTC_RTC0 = 28, RTC_ENABLE_BITS = 1, RTC_ACTIVE_BITS = 2, RTC_LOAD_BITS = 16, SETUP_0_YEAR_SHIFT = 12, SETUP_0_YEAR_MASK = 4095, SETUP_0_MONTH_SHIFT = 8, SETUP_0_MONTH_MASK = 15, SETUP_0_DAY_SHIFT = 0, SETUP_0_DAY_MASK = 31;
var SETUP_1_HOUR_SHIFT = 16, SETUP_1_HOUR_MASK = 31, SETUP_1_MIN_SHIFT = 8, SETUP_1_MIN_MASK = 63, SETUP_1_SEC_SHIFT = 0, SETUP_1_SEC_MASK = 63, RTC_0_YEAR_SHIFT = 12, RTC_0_YEAR_MASK = 4095, RTC_0_MONTH_SHIFT = 8, RTC_0_MONTH_MASK = 15, RTC_0_DAY_SHIFT = 0, RTC_0_DAY_MASK = 31, RTC_1_DOTW_SHIFT = 24, RTC_1_DOTW_MASK = 7, RTC_1_HOUR_SHIFT = 16, RTC_1_HOUR_MASK = 31, RTC_1_MIN_SHIFT = 8, RTC_1_MIN_MASK = 63, RTC_1_SEC_SHIFT = 0, RTC_1_SEC_MASK = 63, RP2040RTC = class extends BasePeripheral {
  constructor() {
    super(...arguments), this.setup0 = 0, this.setup1 = 0, this.ctrl = 0, this.baseline = new Date(2021, 0, 1), this.baselineNanos = 0;
  }
  readUint32(offset) {
    let date = new Date(this.baseline.getTime() + (this.rp2040.clock.nanos - this.baselineNanos) / 1e6);
    switch (offset) {
      case RTC_SETUP0:
        return this.setup0;
      case RTC_SETUP1:
        return this.setup1;
      case RTC_CTRL:
        return this.ctrl;
      case IRQ_SETUP_0:
        return 0;
      case RTC_RTC1:
        return (date.getFullYear() & RTC_0_YEAR_MASK) << RTC_0_YEAR_SHIFT | (date.getMonth() + 1 & RTC_0_MONTH_MASK) << RTC_0_MONTH_SHIFT | (date.getDate() & RTC_0_DAY_MASK) << RTC_0_DAY_SHIFT;
      case RTC_RTC0:
        return (date.getDay() & RTC_1_DOTW_MASK) << RTC_1_DOTW_SHIFT | (date.getHours() & RTC_1_HOUR_MASK) << RTC_1_HOUR_SHIFT | (date.getMinutes() & RTC_1_MIN_MASK) << RTC_1_MIN_SHIFT | (date.getSeconds() & RTC_1_SEC_MASK) << RTC_1_SEC_SHIFT;
      default:
        break;
    }
    return super.readUint32(offset);
  }
  writeUint32(offset, value) {
    switch (offset) {
      case RTC_SETUP0:
        this.setup0 = value;
        break;
      case RTC_SETUP1:
        this.setup1 = value;
        break;
      case RTC_CTRL:
        if (value & RTC_LOAD_BITS && (this.ctrl |= RTC_LOAD_BITS), value & RTC_ENABLE_BITS) {
          if (this.ctrl |= RTC_ENABLE_BITS, this.ctrl |= RTC_ACTIVE_BITS, this.ctrl & RTC_LOAD_BITS) {
            let year = this.setup0 >> SETUP_0_YEAR_SHIFT & SETUP_0_YEAR_MASK, month = this.setup0 >> SETUP_0_MONTH_SHIFT & SETUP_0_MONTH_MASK, day = this.setup0 >> SETUP_0_DAY_SHIFT & SETUP_0_DAY_MASK, hour = this.setup1 >> SETUP_1_HOUR_SHIFT & SETUP_1_HOUR_MASK, min = this.setup1 >> SETUP_1_MIN_SHIFT & SETUP_1_MIN_MASK, sec = this.setup1 >> SETUP_1_SEC_SHIFT & SETUP_1_SEC_MASK;
            this.baseline = new Date(year, month - 1, day, hour, min, sec), this.baselineNanos = this.rp2040.clock.nanos, this.ctrl &= ~RTC_LOAD_BITS;
          }
        } else
          this.ctrl &= ~RTC_ENABLE_BITS, this.ctrl &= ~RTC_ACTIVE_BITS;
        break;
      default:
        super.writeUint32(offset, value);
    }
  }
};

// node_modules/rp2040js/dist/esm/peripherals/spi.js
var SSPCR0 = 0, SSPCR1 = 4, SSPDR = 8, SSPSR = 12, SSPCPSR = 16, SSPIMSC = 20, SSPRIS = 24, SSPMIS = 28, SSPICR = 32, SSPDMACR = 36, SSPPERIPHID0 = 4064, SSPPERIPHID1 = 4068, SSPPERIPHID2 = 4072, SSPPERIPHID3 = 4076, SSPPCELLID0 = 4080, SSPPCELLID1 = 4084, SSPPCELLID2 = 4088, SSPPCELLID3 = 4092, SCR_MASK = 255, SCR_SHIFT = 8, SPH = 128, SPO = 64;
var DSS_MASK = 15, DSS_SHIFT = 0;
var MS = 4, SSE = 2;
var BSY = 16, RFF2 = 8, RNE = 4, TNF = 2, TFE2 = 1, CPSDVSR_MASK = 254;
var SSPTXINTR = 8, SSPRXINTR = 4, SSPRTINTR = 2, SSPRORINTR = 1, RPSPI = class extends BasePeripheral {
  get intStatus() {
    return this.intRaw & this.intEnable;
  }
  get enabled() {
    return !!(this.control1 & SSE);
  }
  /** Data size in bits: 4 to 16 bits */
  get dataBits() {
    return (this.control0 >> DSS_SHIFT & DSS_MASK) + 1;
  }
  get masterMode() {
    return !(this.control0 & MS);
  }
  get spiMode() {
    let cpol = this.control0 & SPO, cpha = this.control0 & SPH;
    return cpol ? cpha ? 2 : 3 : cpha ? 1 : 0;
  }
  get clockFrequency() {
    if (!this.clockDivisor)
      return 0;
    let scr = this.control0 >> SCR_SHIFT & SCR_MASK;
    return this.rp2040.clkPeri / (this.clockDivisor * (1 + scr));
  }
  updateDMATx() {
    this.txFIFO.full ? this.rp2040.dma.clearDREQ(this.dreq.tx) : this.rp2040.dma.setDREQ(this.dreq.tx);
  }
  updateDMARx() {
    this.rxFIFO.empty ? this.rp2040.dma.clearDREQ(this.dreq.rx) : this.rp2040.dma.setDREQ(this.dreq.rx);
  }
  constructor(rp2040, name, irq, dreq) {
    super(rp2040, name), this.irq = irq, this.dreq = dreq, this.rxFIFO = new FIFO(8), this.txFIFO = new FIFO(8), this.onTransmit = () => this.completeTransmit(0), this.busy = !1, this.control0 = 0, this.control1 = 0, this.dmaControl = 0, this.clockDivisor = 0, this.intRaw = 0, this.intEnable = 0, this.updateDMATx(), this.updateDMARx();
  }
  doTX() {
    if (!this.busy && !this.txFIFO.empty) {
      let value = this.txFIFO.pull();
      this.busy = !0, this.onTransmit(value), this.fifosUpdated();
    }
  }
  completeTransmit(rxValue) {
    this.busy = !1, this.rxFIFO.full ? this.intRaw |= SSPRORINTR : this.rxFIFO.push(rxValue), this.fifosUpdated(), this.doTX();
  }
  checkInterrupts() {
    this.rp2040.setInterrupt(this.irq, !!this.intStatus);
  }
  fifosUpdated() {
    let prevStatus = this.intStatus;
    this.txFIFO.itemCount <= this.txFIFO.size / 2 ? this.intRaw |= SSPTXINTR : this.intRaw &= ~SSPTXINTR, this.rxFIFO.itemCount >= this.rxFIFO.size / 2 ? this.intRaw |= SSPRXINTR : this.intRaw &= ~SSPRXINTR, this.intStatus !== prevStatus && this.checkInterrupts(), this.updateDMATx(), this.updateDMARx();
  }
  readUint32(offset) {
    switch (offset) {
      case SSPCR0:
        return this.control0;
      case SSPCR1:
        return this.control1;
      case SSPDR:
        if (!this.rxFIFO.empty) {
          let value = this.rxFIFO.pull();
          return this.fifosUpdated(), value;
        }
        return 0;
      case SSPSR:
        return (this.busy || !this.txFIFO.empty ? BSY : 0) | (this.rxFIFO.full ? RFF2 : 0) | (this.rxFIFO.empty ? 0 : RNE) | (this.txFIFO.full ? 0 : TNF) | (this.txFIFO.empty ? TFE2 : 0);
      case SSPCPSR:
        return this.clockDivisor;
      case SSPIMSC:
        return this.intEnable;
      case SSPRIS:
        return this.intRaw;
      case SSPMIS:
        return this.intStatus;
      case SSPDMACR:
        return this.dmaControl;
      case SSPPERIPHID0:
        return 34;
      case SSPPERIPHID1:
        return 16;
      case SSPPERIPHID2:
        return 52;
      case SSPPERIPHID3:
        return 0;
      case SSPPCELLID0:
        return 13;
      case SSPPCELLID1:
        return 240;
      case SSPPCELLID2:
        return 5;
      case SSPPCELLID3:
        return 177;
    }
    return super.readUint32(offset);
  }
  writeUint32(offset, value) {
    switch (offset) {
      case SSPCR0:
        this.control0 = value;
        return;
      case SSPCR1:
        this.control1 = value;
        return;
      case SSPDR:
        this.txFIFO.full || (this.txFIFO.push(value & (1 << this.dataBits) - 1), this.doTX(), this.fifosUpdated());
        return;
      case SSPCPSR:
        this.clockDivisor = value & CPSDVSR_MASK;
        return;
      case SSPIMSC:
        this.intEnable = value, this.checkInterrupts();
        return;
      case SSPDMACR:
        this.dmaControl = value;
        return;
      case SSPICR:
        this.intRaw &= ~(value & (SSPRTINTR | SSPRORINTR)), this.checkInterrupts();
        return;
      default:
        super.writeUint32(offset, value);
    }
  }
};

// node_modules/rp2040js/dist/esm/peripherals/ssi.js
var SSI_CTRLR0 = 0, SSI_CTRLR1 = 4, SSI_SSIENR = 8;
var SSI_BAUDR = 20;
var SSI_TXFLR = 32, SSI_RXFLR = 36, SSI_SR = 40, SSI_SR_TFNF_BITS = 2, SSI_SR_TFE_BITS = 4, SSI_SR_RFNE_BITS = 8;
var SSI_IDR = 88, SSI_VERSION_ID = 92, SSI_DR0 = 96, SSI_RX_SAMPLE_DLY = 240, SSI_SPI_CTRL_R0 = 244, SSI_TXD_DRIVE_EDGE = 248, CMD_READ_STATUS = 5, RPSSI = class extends BasePeripheral {
  constructor() {
    super(...arguments), this.dr0 = 0, this.txflr = 0, this.rxflr = 0, this.baudr = 0, this.crtlr0 = 0, this.crtlr1 = 0, this.ssienr = 0, this.spictlr0 = 0, this.rxsampldly = 0, this.txddriveedge = 0;
  }
  readUint32(offset) {
    switch (offset) {
      case SSI_TXFLR:
        return this.txflr;
      case SSI_RXFLR:
        return this.rxflr;
      case SSI_CTRLR0:
        return this.crtlr0;
      /*  & 0x017FFFFF = b23,b25..31 reserved */
      case SSI_CTRLR1:
        return this.crtlr1;
      case SSI_SSIENR:
        return this.ssienr;
      case SSI_BAUDR:
        return this.baudr;
      case SSI_SR:
        return SSI_SR_TFE_BITS | SSI_SR_RFNE_BITS | SSI_SR_TFNF_BITS;
      case SSI_IDR:
        return 1364414537;
      case SSI_VERSION_ID:
        return 875573546;
      case SSI_RX_SAMPLE_DLY:
        return this.rxsampldly;
      case SSI_TXD_DRIVE_EDGE:
        return this.txddriveedge;
      case SSI_SPI_CTRL_R0:
        return this.spictlr0;
      /* b6,7,10,19..23 reserved */
      case SSI_DR0:
        return this.dr0;
    }
    return super.readUint32(offset);
  }
  writeUint32(offset, value) {
    switch (offset) {
      case SSI_TXFLR:
        this.txflr = value;
        return;
      case SSI_RXFLR:
        this.rxflr = value;
        return;
      case SSI_CTRLR0:
        this.crtlr0 = value;
        return;
      case SSI_CTRLR1:
        this.crtlr1 = value;
        return;
      case SSI_SSIENR:
        this.ssienr = value;
        return;
      case SSI_BAUDR:
        this.baudr = value;
        return;
      case SSI_RX_SAMPLE_DLY:
        this.rxsampldly = value & 255;
        return;
      case SSI_TXD_DRIVE_EDGE:
        this.txddriveedge = value & 255;
        return;
      case SSI_SPI_CTRL_R0:
        this.spictlr0 = value;
        return;
      case SSI_DR0:
        value === CMD_READ_STATUS && (this.dr0 = 0);
        return;
      default:
        super.writeUint32(offset, value);
    }
  }
};

// node_modules/rp2040js/dist/esm/peripherals/syscfg.js
var PROC0_NMI_MASK = 0;
var RP2040SysCfg = class extends BasePeripheral {
  readUint32(offset) {
    switch (offset) {
      case PROC0_NMI_MASK:
        return this.rp2040.core.interruptNMIMask;
    }
    return super.readUint32(offset);
  }
  writeUint32(offset, value) {
    switch (offset) {
      case PROC0_NMI_MASK:
        this.rp2040.core.interruptNMIMask = value;
        break;
      default:
        super.writeUint32(offset, value);
    }
  }
};

// node_modules/rp2040js/dist/esm/peripherals/sysinfo.js
var CHIP_ID = 0, PLATFORM = 4, GITREF_RP2040 = 64, RP2040SysInfo = class extends BasePeripheral {
  readUint32(offset) {
    switch (offset) {
      case CHIP_ID:
        return 268445991;
      case PLATFORM:
        return 2;
      case GITREF_RP2040:
        return 3771273960;
    }
    return super.readUint32(offset);
  }
};

// node_modules/rp2040js/dist/esm/peripherals/tbman.js
var PLATFORM2 = 0, ASIC = 1, RPTBMAN = class extends BasePeripheral {
  readUint32(offset) {
    switch (offset) {
      case PLATFORM2:
        return ASIC;
      default:
        return super.readUint32(offset);
    }
  }
};

// node_modules/rp2040js/dist/esm/peripherals/timer.js
var TIMEHR = 8, TIMELR = 12, TIMERAWH = 36, TIMERAWL = 40, ALARM0 = 16, ALARM1 = 20, ALARM2 = 24, ALARM3 = 28, ARMED = 32, PAUSE = 48, INTR5 = 52, INTE3 = 56, INTF3 = 60, INTS3 = 64, ALARM_0 = 1, ALARM_1 = 2, ALARM_2 = 4, ALARM_3 = 8, timerInterrupts = [IRQ.TIMER_0, IRQ.TIMER_1, IRQ.TIMER_2, IRQ.TIMER_3], RPTimerAlarm = class {
  constructor(bitValue, clockAlarm) {
    this.bitValue = bitValue, this.clockAlarm = clockAlarm, this.armed = !1, this.targetMicros = 0;
  }
}, RPTimer = class extends BasePeripheral {
  constructor(rp2040, name) {
    super(rp2040, name), this.latchedTimeHigh = 0, this.intRaw = 0, this.intEnable = 0, this.intForce = 0, this.paused = !1, this.clock = rp2040.clock, this.alarms = [
      new RPTimerAlarm(ALARM_0, this.clock.createAlarm(() => this.fireAlarm(0))),
      new RPTimerAlarm(ALARM_1, this.clock.createAlarm(() => this.fireAlarm(1))),
      new RPTimerAlarm(ALARM_2, this.clock.createAlarm(() => this.fireAlarm(2))),
      new RPTimerAlarm(ALARM_3, this.clock.createAlarm(() => this.fireAlarm(3)))
    ];
  }
  get intStatus() {
    return this.intRaw & this.intEnable | this.intForce;
  }
  readUint32(offset) {
    let time = this.clock.nanos / 1e3;
    switch (offset) {
      case TIMEHR:
        return this.latchedTimeHigh;
      case TIMELR:
        return this.latchedTimeHigh = Math.floor(time / 2 ** 32), time >>> 0;
      case TIMERAWH:
        return Math.floor(time / 2 ** 32);
      case TIMERAWL:
        return time >>> 0;
      case ALARM0:
        return this.alarms[0].targetMicros;
      case ALARM1:
        return this.alarms[1].targetMicros;
      case ALARM2:
        return this.alarms[2].targetMicros;
      case ALARM3:
        return this.alarms[3].targetMicros;
      case PAUSE:
        return this.paused ? 1 : 0;
      case INTR5:
        return this.intRaw;
      case INTE3:
        return this.intEnable;
      case INTF3:
        return this.intForce;
      case INTS3:
        return this.intStatus;
      case ARMED:
        return (this.alarms[0].armed ? this.alarms[0].bitValue : 0) | (this.alarms[1].armed ? this.alarms[1].bitValue : 0) | (this.alarms[2].armed ? this.alarms[2].bitValue : 0) | (this.alarms[3].armed ? this.alarms[3].bitValue : 0);
    }
    return super.readUint32(offset);
  }
  writeUint32(offset, value) {
    switch (offset) {
      case ALARM0:
      case ALARM1:
      case ALARM2:
      case ALARM3: {
        let alarmIndex = (offset - ALARM0) / 4, alarm = this.alarms[alarmIndex], deltaMicros = value - this.clock.nanos / 1e3 >>> 0;
        alarm.armed = !0, alarm.targetMicros = value, alarm.clockAlarm.schedule(deltaMicros * 1e3);
        break;
      }
      case ARMED:
        for (let alarm of this.alarms)
          this.rawWriteValue & alarm.bitValue && this.disarmAlarm(alarm);
        break;
      case PAUSE:
        this.paused = !!(value & 1), this.paused && this.warn("Unimplemented Timer Pause");
        break;
      case INTR5:
        this.intRaw &= ~this.rawWriteValue, this.checkInterrupts();
        break;
      case INTE3:
        this.intEnable = value & 15, this.checkInterrupts();
        break;
      case INTF3:
        this.intForce = value & 15, this.checkInterrupts();
        break;
      default:
        super.writeUint32(offset, value);
    }
  }
  fireAlarm(index) {
    let alarm = this.alarms[index];
    this.disarmAlarm(alarm), this.intRaw |= alarm.bitValue, this.checkInterrupts();
  }
  checkInterrupts() {
    let { intStatus } = this;
    for (let i = 0; i < this.alarms.length; i++)
      this.rp2040.setInterrupt(timerInterrupts[i], !!(intStatus & 1 << i));
  }
  disarmAlarm(alarm) {
    alarm.clockAlarm.cancel(), alarm.armed = !1;
  }
};

// node_modules/rp2040js/dist/esm/peripherals/uart.js
var UARTDR = 0, UARTFR = 24, UARTIBRD = 36, UARTFBRD = 40, UARTLCR_H = 44, UARTCR = 48, UARTIMSC = 56, UARTIRIS = 60, UARTIMIS = 64, UARTICR = 68, UARTPERIPHID0 = 4064, UARTPERIPHID1 = 4068, UARTPERIPHID2 = 4072, UARTPERIPHID3 = 4076, UARTPCELLID0 = 4080, UARTPCELLID1 = 4084, UARTPCELLID2 = 4088, UARTPCELLID3 = 4092, TXFE = 128, RXFF = 64, RXFE = 16, FEN = 16, RXE = 512, TXE = 256, UARTEN = 1, UARTTXINTR = 32, UARTRXINTR = 16, RPUART = class extends BasePeripheral {
  constructor(rp2040, name, irq, dreq) {
    super(rp2040, name), this.irq = irq, this.dreq = dreq, this.ctrlRegister = RXE | TXE, this.lineCtrlRegister = 0, this.rxFIFO = new FIFO(32), this.interruptMask = 0, this.interruptStatus = 0, this.intDivisor = 0, this.fracDivisor = 0;
  }
  get enabled() {
    return !!(this.ctrlRegister & UARTEN);
  }
  get txEnabled() {
    return !!(this.ctrlRegister & TXE);
  }
  get rxEnabled() {
    return !!(this.ctrlRegister & RXE);
  }
  get fifosEnabled() {
    return !!(this.lineCtrlRegister & FEN);
  }
  /**
   * Number of bits per UART character
   */
  get wordLength() {
    switch (this.lineCtrlRegister >>> 5 & 3) {
      case 0:
        return 5;
      case 1:
        return 6;
      case 2:
        return 7;
      case 3:
        return 8;
    }
  }
  get baudDivider() {
    return this.intDivisor + this.fracDivisor / 64;
  }
  get baudRate() {
    return Math.round(this.rp2040.clkPeri / (this.baudDivider * 16));
  }
  /** Re-reports the baud rate, unless the firmware has not set the divider yet. */
  clkPeriChanged() {
    var _a;
    this.baudDivider && ((_a = this.onBaudRateChange) === null || _a === void 0 || _a.call(this, this.baudRate));
  }
  get flags() {
    return (this.rxFIFO.full ? RXFF : 0) | (this.rxFIFO.empty ? RXFE : 0) | TXFE;
  }
  checkInterrupts() {
    this.interruptStatus |= UARTTXINTR, this.rp2040.setInterrupt(this.irq, !!(this.interruptStatus & this.interruptMask));
  }
  feedByte(value) {
    this.rxFIFO.push(value), this.interruptStatus |= UARTRXINTR, this.checkInterrupts();
  }
  readUint32(offset) {
    switch (offset) {
      case UARTDR: {
        let value = this.rxFIFO.pull();
        return this.rxFIFO.empty ? this.interruptStatus &= ~UARTRXINTR : this.interruptStatus |= UARTRXINTR, this.checkInterrupts(), value;
      }
      case UARTFR:
        return this.flags;
      case UARTIBRD:
        return this.intDivisor;
      case UARTFBRD:
        return this.fracDivisor;
      case UARTLCR_H:
        return this.lineCtrlRegister;
      case UARTCR:
        return this.ctrlRegister;
      case UARTIMSC:
        return this.interruptMask;
      case UARTIRIS:
        return this.interruptStatus;
      case UARTIMIS:
        return this.interruptStatus & this.interruptMask;
      case UARTPERIPHID0:
        return 17;
      case UARTPERIPHID1:
        return 16;
      case UARTPERIPHID2:
        return 52;
      case UARTPERIPHID3:
        return 0;
      case UARTPCELLID0:
        return 13;
      case UARTPCELLID1:
        return 240;
      case UARTPCELLID2:
        return 5;
      case UARTPCELLID3:
        return 177;
    }
    return super.readUint32(offset);
  }
  writeUint32(offset, value) {
    var _a, _b, _c;
    switch (offset) {
      case UARTDR:
        (_a = this.onByte) === null || _a === void 0 || _a.call(this, value & 255);
        break;
      case UARTIBRD:
        this.intDivisor = value & 65535, (_b = this.onBaudRateChange) === null || _b === void 0 || _b.call(this, this.baudRate);
        break;
      case UARTFBRD:
        this.fracDivisor = value & 63, (_c = this.onBaudRateChange) === null || _c === void 0 || _c.call(this, this.baudRate);
        break;
      case UARTLCR_H:
        this.lineCtrlRegister = value;
        break;
      case UARTCR:
        this.ctrlRegister = value, this.enabled ? this.rp2040.dma.setDREQ(this.dreq.tx) : this.rp2040.dma.clearDREQ(this.dreq.tx);
        break;
      case UARTIMSC:
        this.interruptMask = value & 2047, this.checkInterrupts();
        break;
      case UARTICR:
        this.interruptStatus &= ~this.rawWriteValue, this.checkInterrupts();
        break;
      default:
        super.writeUint32(offset, value);
    }
  }
};

// node_modules/rp2040js/dist/esm/usb/usb-device.js
function parseSetupPacket(setup) {
  return {
    bmRequestType: setup[0],
    bRequest: setup[1],
    wValue: setup[2] | setup[3] << 8,
    wIndex: setup[4] | setup[5] << 8,
    wLength: setup[6] | setup[7] << 8,
    // Helpers
    direction: setup[0] & 128 ? "in" : "out",
    type: setup[0] >> 5 & 3,
    // 0=Standard, 1=Class, 2=Vendor
    recipient: setup[0] & 31
    // 0=Device, 1=Interface, 2=Endpoint, 3=Other
  };
}

// node_modules/rp2040js/dist/esm/peripherals/usb.js
var ENDPOINT_COUNT = 16, USB_HOST_INTERRUPT_ENDPOINTS = 15, EP1_IN_CONTROL = 8, EP0_IN_BUFFER_CONTROL = 128, EP0_OUT_BUFFER_CONTROL = 132, EP15_OUT_BUFFER_CONTROL = 252, HOST_SETUP_PACKET = 0, HOST_INT_EP_CTRL_BASE = 8, HOST_INT_EP_BUF_CTRL_BASE = 136, HOST_EPX_BUF_CTRL = 128, HOST_EPX_DATA = 384, USB_CTRL_DOUBLE_BUF = 1 << 30, USB_CTRL_INTERRUPT_PER_TRANSFER = 1 << 29, EP_CTRL_ENABLE_BITS = 1 << 31;
var EP_CTRL_HOST_INTERRUPT_INTERVAL_LSB = 16, USB_BUF_CTRL_AVAILABLE = 1024, USB_BUF_CTRL_FULL = 32768, USB_BUF_CTRL_LEN_MASK = 1023, USB_BUF_CTRL_DATA1_PID = 8192;
var USB_BUF1_SHIFT = 16, USB_BUF1_OFFSET = 64, ADDR_ENDP = 0, ADDR_ENDP1 = 4, ADDR_ENDP15 = 60, MAIN_CTRL = 64, SOF_WR = 68, SOF_RD = 72, SIE_CTRL = 76, SIE_STATUS = 80, INT_EP_CTRL = 84, BUFF_STATUS = 88, BUFF_CPU_SHOULD_HANDLE = 92, EP_ABORT = 96, EP_ABORT_DONE = 100, EP_STALL_ARM = 104, NAK_POLL = 108, EP_STATUS_STALL_NAK = 112, USB_MUXING = 116, USB_PWR = 120;
var INTR6 = 140, INTE4 = 144, INTF4 = 148, INTS4 = 152, SIM_TIMING = 1 << 31, HOST_NDEVICE = 2, CONTROLLER_EN = 1, SIE_CTRL_EP0_INT_STALL = 1 << 31, SIE_CTRL_EP0_DOUBLE_BUF = 1 << 30, SIE_CTRL_EP0_INT_1BUF = 1 << 29, SIE_CTRL_EP0_INT_2BUF = 1 << 28, SIE_CTRL_EP0_INT_NAK = 1 << 27, SIE_CTRL_DIRECT_EN = 1 << 26, SIE_CTRL_DIRECT_DP = 1 << 25, SIE_CTRL_DIRECT_DM = 1 << 24, SIE_CTRL_TRANSCEIVER_PD = 1 << 18, SIE_CTRL_RPU_OPT = 1 << 17;
var SIE_CTRL_RESET_BUS = 8192;
var SIE_CTRL_SOF_EN = 512;
var SIE_CTRL_RECEIVE_DATA = 8, SIE_CTRL_SEND_DATA = 4, SIE_CTRL_SEND_SETUP = 2, SIE_CTRL_START_TRANS = 1, SIE_DATA_SEQ_ERROR = 1 << 31, SIE_ACK_REC = 1 << 30, SIE_STALL_REC = 1 << 29, SIE_NAK_REC = 1 << 28, SIE_RX_TIMEOUT = 1 << 27, SIE_RX_OVERFLOW = 1 << 26, SIE_BIT_STUFF_ERROR = 1 << 25, SIE_CRC_ERROR = 1 << 24, SIE_BUS_RESET = 1 << 19, SIE_TRANS_COMPLETE = 1 << 18, SIE_SETUP_REC = 1 << 17, SIE_CONNECTED = 65536, SIE_RESUME = 2048;
var SIE_SPEED_FS_VALUE = 2, SIE_SUSPENDED = 16, SIE_LINE_STATE_MASK = 3, SIE_LINE_STATE_SHIFT = 2, SIE_VBUS_DETECTED = 1;
var TO_DIGITAL_PAD = 4;
var TO_PHY = 1, PWR_VBUS_DETECT = 8, PWR_VBUS_DETECT_OVERRIDE_EN = 4;
var INTR_EP_STALL_NAK = 1 << 19, INTR_ABORT_DONE = 1 << 18, INTR_DEV_SOF = 1 << 17, INTR_SETUP_REQ = 65536, INTR_DEV_RESUME_FROM_HOST = 32768, INTR_DEV_SUSPEND = 16384, INTR_DEV_CONN_DIS = 8192, INTR_BUS_RESET = 4096, INTR_VBUS_DETECT = 2048, INTR_STALL = 1024, INTR_ERROR_CRC = 512, INTR_ERROR_BIT_STUFF = 256, INTR_ERROR_RX_OVERFLOW = 128, INTR_ERROR_RX_TIMEOUT = 64, INTR_ERROR_DATA_SEQ = 32, INTR_BUFF_STATUS = 16, INTR_TRANS_COMPLETE = 8, INTR_HOST_SOF = 4;
var INTR_HOST_CONN_DIS = 1, SIELineState;
(function(SIELineState2) {
  SIELineState2[SIELineState2.SE0 = 0] = "SE0", SIELineState2[SIELineState2.J = 1] = "J", SIELineState2[SIELineState2.K = 2] = "K", SIELineState2[SIELineState2.SE1 = 3] = "SE1";
})(SIELineState || (SIELineState = {}));
var SIE_WRITECLEAR_MASK = SIE_DATA_SEQ_ERROR | SIE_ACK_REC | SIE_STALL_REC | SIE_NAK_REC | SIE_RX_TIMEOUT | SIE_RX_OVERFLOW | SIE_BIT_STUFF_ERROR | SIE_CONNECTED | SIE_CRC_ERROR | SIE_BUS_RESET | SIE_TRANS_COMPLETE | SIE_SETUP_REC | SIE_RESUME, USBEndpointAlarm = class {
  constructor(alarm) {
    this.alarm = alarm, this.buffers = [];
  }
  schedule(buffer, delayNanos) {
    this.buffers.push(buffer), this.alarm.schedule(delayNanos);
  }
}, RPUSBController = class extends BasePeripheral {
  get intStatus() {
    return this.intRaw & this.intEnable | this.intForce;
  }
  constructor(rp2040, name) {
    super(rp2040, name), this.addrEndp = 0, this.mainCtrl = 0, this.intRaw = 0, this.intEnable = 0, this.intForce = 0, this.sieStatus = 0, this.buffStatus = 0, this.sieCtrl = 0, this.sofFrameNumber = 0, this.devAddrCtrl = 0, this.intEpAddrCtrl = new Array(USB_HOST_INTERRUPT_ENDPOINTS).fill(0), this.intEpCtrl = 0, this.usbPwr = 0, this.nakPoll = 0, this.epAbort = 0, this.epAbortDone = 0, this.epStallArm = 0, this.epStatusStallNak = 0, this.hostMode = !1, this.sofEnabled = !1, this.connectedDevice = null, this.pendingSetupResponse = null, this.controlDataPid = 1, this.expectingStatusPhase = !1, this.readDelayMicroseconds = 10, this.writeDelayMicroseconds = 10, this.hostTransactionDelayMicroseconds = 5;
    let clock = rp2040.clock;
    this.endpointReadAlarms = [], this.endpointWriteAlarms = [];
    for (let i = 0; i < ENDPOINT_COUNT; ++i)
      this.endpointReadAlarms.push(new USBEndpointAlarm(clock.createAlarm(() => {
        let buffer = this.endpointReadAlarms[i].buffers.shift();
        buffer && this.finishRead(i, buffer);
      }))), this.endpointWriteAlarms.push(new USBEndpointAlarm(clock.createAlarm(() => {
        var _a;
        for (let buffer of this.endpointWriteAlarms[i].buffers)
          (_a = this.onEndpointWrite) === null || _a === void 0 || _a.call(this, i, buffer);
        this.endpointWriteAlarms[i].buffers = [];
      })));
    this.resetAlarm = clock.createAlarm(() => {
      this.sieStatus |= SIE_BUS_RESET, this.sieStatusUpdated();
    }), this.sofAlarm = clock.createAlarm(() => {
      this.generateSOF();
    }), this.hostTransactionAlarm = clock.createAlarm(() => {
      this.completeHostTransaction();
    });
  }
  readUint32(offset) {
    if (offset >= ADDR_ENDP1 && offset <= ADDR_ENDP15 && !(offset & 3)) {
      let epIndex = offset - ADDR_ENDP1 >> 2;
      return this.intEpAddrCtrl[epIndex];
    }
    switch (offset) {
      case ADDR_ENDP:
        return this.hostMode ? this.devAddrCtrl : this.addrEndp & 491647;
      case MAIN_CTRL:
        return this.mainCtrl;
      case SOF_WR:
        return 0;
      // Write-only
      case SOF_RD:
        return this.sofFrameNumber & 2047;
      case SIE_CTRL:
        return this.sieCtrl;
      case SIE_STATUS:
        return this.hostMode && this.intRaw & INTR_HOST_CONN_DIS && (this.intRaw &= ~INTR_HOST_CONN_DIS, this.checkInterrupts()), this.sieStatus;
      case INT_EP_CTRL:
        return this.intEpCtrl;
      case BUFF_STATUS:
        return this.buffStatus;
      case BUFF_CPU_SHOULD_HANDLE:
        return 0;
      case EP_ABORT:
        return this.epAbort;
      case EP_ABORT_DONE:
        return this.epAbortDone;
      case EP_STALL_ARM:
        return this.epStallArm;
      case NAK_POLL:
        return this.nakPoll;
      case EP_STATUS_STALL_NAK:
        return this.epStatusStallNak;
      case USB_PWR:
        return this.usbPwr;
      case INTR6:
        return this.intRaw;
      case INTE4:
        return this.intEnable;
      case INTF4:
        return this.intForce;
      case INTS4:
        return this.intStatus;
    }
    return super.readUint32(offset);
  }
  writeUint32(offset, value) {
    var _a, _b;
    if (offset >= ADDR_ENDP1 && offset <= ADDR_ENDP15 && !(offset & 3)) {
      let epIndex = offset - ADDR_ENDP1 >> 2;
      this.intEpAddrCtrl[epIndex] = value;
      return;
    }
    switch (offset) {
      case ADDR_ENDP:
        this.hostMode ? this.devAddrCtrl = value : this.addrEndp = value;
        break;
      case MAIN_CTRL:
        this.mainCtrl = value & (SIM_TIMING | CONTROLLER_EN | HOST_NDEVICE), this.hostMode = !!(value & HOST_NDEVICE), value & CONTROLLER_EN && (this.hostMode ? (this.debug("USB Host mode enabled"), this.connectedDevice && this.onDeviceConnected()) : (_a = this.onUSBEnabled) === null || _a === void 0 || _a.call(this));
        break;
      case SOF_WR:
        this.sofFrameNumber = value & 2047;
        break;
      case SIE_CTRL:
        this.handleSieCtrlWrite(value);
        break;
      case INT_EP_CTRL:
        this.intEpCtrl = value;
        break;
      case BUFF_STATUS:
        this.buffStatus &= ~this.rawWriteValue, this.buffStatusUpdated();
        break;
      case EP_ABORT:
        this.epAbort = value, this.epAbortDone |= value;
        break;
      case EP_ABORT_DONE:
        this.epAbortDone &= ~this.rawWriteValue;
        break;
      case EP_STALL_ARM:
        this.epStallArm = value;
        break;
      case NAK_POLL:
        this.nakPoll = value;
        break;
      case EP_STATUS_STALL_NAK:
        this.epStatusStallNak &= ~this.rawWriteValue;
        break;
      case USB_MUXING:
        value & TO_DIGITAL_PAD && !(value & TO_PHY) && (this.sieStatus |= SIE_CONNECTED);
        break;
      case USB_PWR:
        this.usbPwr = value, value & PWR_VBUS_DETECT_OVERRIDE_EN && (value & PWR_VBUS_DETECT ? this.sieStatus |= SIE_VBUS_DETECTED : this.sieStatus &= ~SIE_VBUS_DETECTED);
        break;
      case SIE_STATUS:
        this.sieStatus &= ~(this.rawWriteValue & SIE_WRITECLEAR_MASK), this.rawWriteValue & SIE_BUS_RESET && (this.hostMode || (_b = this.onResetReceived) === null || _b === void 0 || _b.call(this), this.sieStatus &= ~(SIE_LINE_STATE_MASK << SIE_LINE_STATE_SHIFT), this.sieStatus |= SIELineState.J << SIE_LINE_STATE_SHIFT | SIE_CONNECTED), this.sieStatusUpdated();
        break;
      case INTE4:
        this.intEnable = value & 1048575, this.checkInterrupts();
        break;
      case INTF4:
        this.intForce = value & 1048575, this.checkInterrupts();
        break;
      default:
        super.writeUint32(offset, value);
    }
  }
  readEndpointControlReg(endpoint, out) {
    let controlRegOffset = EP1_IN_CONTROL + 8 * (endpoint - 1) + (out ? 4 : 0);
    return this.rp2040.usbDPRAMView.getUint32(controlRegOffset, !0);
  }
  getEndpointBufferOffset(endpoint, out) {
    return endpoint === 0 ? 256 : this.readEndpointControlReg(endpoint, out) & 65472;
  }
  DPRAMUpdated(offset, value) {
    var _a, _b;
    if (!this.hostMode && value & USB_BUF_CTRL_AVAILABLE && offset >= EP0_IN_BUFFER_CONTROL && offset <= EP15_OUT_BUFFER_CONTROL) {
      let endpoint = offset - EP0_IN_BUFFER_CONTROL >> 3, bufferOut = !!(offset & 4), doubleBuffer = !1, interrupt = !0;
      if (endpoint != 0) {
        let control = this.readEndpointControlReg(endpoint, bufferOut);
        doubleBuffer = !!(control & USB_CTRL_DOUBLE_BUF), interrupt = !!(control & USB_CTRL_INTERRUPT_PER_TRANSFER);
      }
      if (doubleBuffer && value >> USB_BUF1_SHIFT & USB_BUF_CTRL_AVAILABLE) {
        let bufferLength2 = value >> USB_BUF1_SHIFT & USB_BUF_CTRL_LEN_MASK, bufferOffset2 = this.getEndpointBufferOffset(endpoint, bufferOut) + USB_BUF1_OFFSET;
        if (this.debug(`Start USB transfer, endPoint=${endpoint}, direction=${bufferOut ? "out" : "in"} buffer=${bufferOffset2.toString(16)} length=${bufferLength2}`), value &= ~(USB_BUF_CTRL_AVAILABLE << USB_BUF1_SHIFT), this.rp2040.usbDPRAMView.setUint32(offset, value, !0), bufferOut)
          (_a = this.onEndpointRead) === null || _a === void 0 || _a.call(this, endpoint, bufferLength2);
        else {
          value &= ~(USB_BUF_CTRL_FULL << USB_BUF1_SHIFT), this.rp2040.usbDPRAMView.setUint32(offset, value, !0);
          let buffer = this.rp2040.usbDPRAM.slice(bufferOffset2, bufferOffset2 + bufferLength2);
          this.indicateBufferReady(endpoint, !1), this.endpointWriteAlarms[endpoint].schedule(buffer, this.writeDelayMicroseconds * 1e3);
        }
      }
      let bufferLength = value & USB_BUF_CTRL_LEN_MASK, bufferOffset = this.getEndpointBufferOffset(endpoint, bufferOut);
      if (this.debug(`Start USB transfer, endPoint=${endpoint}, direction=${bufferOut ? "out" : "in"} buffer=${bufferOffset.toString(16)} length=${bufferLength}`), value &= ~USB_BUF_CTRL_AVAILABLE, this.rp2040.usbDPRAMView.setUint32(offset, value, !0), bufferOut)
        (_b = this.onEndpointRead) === null || _b === void 0 || _b.call(this, endpoint, bufferLength);
      else {
        value &= ~USB_BUF_CTRL_FULL, this.rp2040.usbDPRAMView.setUint32(offset, value, !0);
        let buffer = this.rp2040.usbDPRAM.slice(bufferOffset, bufferOffset + bufferLength);
        (interrupt || !doubleBuffer) && this.indicateBufferReady(endpoint, !1), this.endpointWriteAlarms[endpoint].schedule(buffer, this.writeDelayMicroseconds * 1e3);
      }
    }
  }
  endpointReadDone(endpoint, buffer, delay = this.readDelayMicroseconds) {
    this.endpointReadAlarms[endpoint].schedule(buffer, delay * 1e3);
  }
  finishRead(endpoint, buffer) {
    let bufferOffset = this.getEndpointBufferOffset(endpoint, !0), bufControlReg = EP0_OUT_BUFFER_CONTROL + endpoint * 8, bufControl = this.rp2040.usbDPRAMView.getUint32(bufControlReg, !0), requestedLength = bufControl & USB_BUF_CTRL_LEN_MASK, newLength = Math.min(buffer.length, requestedLength);
    bufControl |= USB_BUF_CTRL_FULL, bufControl = bufControl & ~USB_BUF_CTRL_LEN_MASK | newLength & USB_BUF_CTRL_LEN_MASK, this.rp2040.usbDPRAMView.setUint32(bufControlReg, bufControl, !0), this.rp2040.usbDPRAM.set(buffer.subarray(0, newLength), bufferOffset), this.indicateBufferReady(endpoint, !0);
  }
  checkInterrupts() {
    let { intStatus } = this;
    this.rp2040.setInterrupt(IRQ.USBCTRL, !!intStatus);
  }
  resetDevice() {
    this.resetAlarm.schedule(1e7);
  }
  sendSetupPacket(setupPacket) {
    this.rp2040.usbDPRAM.set(setupPacket), this.sieStatus |= SIE_SETUP_REC, this.sieStatusUpdated();
  }
  indicateBufferReady(endpoint, out) {
    this.buffStatus |= 1 << endpoint * 2 + (out ? 1 : 0), this.buffStatusUpdated();
  }
  buffStatusUpdated() {
    this.buffStatus ? this.intRaw |= INTR_BUFF_STATUS : this.intRaw &= ~INTR_BUFF_STATUS, this.checkInterrupts();
  }
  sieStatusUpdated() {
    if (this.hostMode) {
      let intRegisterMap = [
        [SIE_TRANS_COMPLETE, INTR_TRANS_COMPLETE],
        [SIE_STALL_REC, INTR_STALL],
        [SIE_CRC_ERROR, INTR_ERROR_CRC],
        [SIE_BIT_STUFF_ERROR, INTR_ERROR_BIT_STUFF],
        [SIE_RX_OVERFLOW, INTR_ERROR_RX_OVERFLOW],
        [SIE_RX_TIMEOUT, INTR_ERROR_RX_TIMEOUT],
        [SIE_DATA_SEQ_ERROR, INTR_ERROR_DATA_SEQ]
      ];
      for (let [sieBit, intRawBit] of intRegisterMap)
        this.sieStatus & sieBit ? this.intRaw |= intRawBit : this.intRaw &= ~intRawBit;
    } else {
      let intRegisterMap = [
        [SIE_SETUP_REC, INTR_SETUP_REQ],
        [SIE_RESUME, INTR_DEV_RESUME_FROM_HOST],
        [SIE_SUSPENDED, INTR_DEV_SUSPEND],
        [SIE_CONNECTED, INTR_DEV_CONN_DIS],
        [SIE_BUS_RESET, INTR_BUS_RESET],
        [SIE_VBUS_DETECTED, INTR_VBUS_DETECT],
        [SIE_STALL_REC, INTR_STALL],
        [SIE_CRC_ERROR, INTR_ERROR_CRC],
        [SIE_BIT_STUFF_ERROR, INTR_ERROR_BIT_STUFF],
        [SIE_RX_OVERFLOW, INTR_ERROR_RX_OVERFLOW],
        [SIE_RX_TIMEOUT, INTR_ERROR_RX_TIMEOUT],
        [SIE_DATA_SEQ_ERROR, INTR_ERROR_DATA_SEQ]
      ];
      for (let [sieBit, intRawBit] of intRegisterMap)
        this.sieStatus & sieBit ? this.intRaw |= intRawBit : this.intRaw &= ~intRawBit;
    }
    this.checkInterrupts();
  }
  // ============ Host Mode Methods ============
  /**
   * Connect a simulated USB device to the host controller.
   */
  connectDevice(device) {
    this.connectedDevice = device, this.hostMode && this.mainCtrl & CONTROLLER_EN && this.onDeviceConnected();
  }
  /**
   * Disconnect the simulated USB device from the host controller.
   */
  disconnectDevice() {
    this.connectedDevice && this.hostMode && (this.connectedDevice = null, this.sieStatus &= -769, this.intRaw |= INTR_HOST_CONN_DIS, this.checkInterrupts()), this.connectedDevice = null;
  }
  onDeviceConnected() {
    this.sieStatus &= -769, this.sieStatus |= SIE_SPEED_FS_VALUE << 8, this.intRaw |= INTR_HOST_CONN_DIS, this.checkInterrupts(), this.debug("USB device connected (full-speed)");
  }
  handleSieCtrlWrite(value) {
    this.sieCtrl = value, value & SIE_CTRL_SOF_EN && !this.sofEnabled ? (this.sofEnabled = !0, this.scheduleSofPacket(), this.debug("SOF generation enabled")) : !(value & SIE_CTRL_SOF_EN) && this.sofEnabled && (this.sofEnabled = !1, this.debug("SOF generation disabled")), value & SIE_CTRL_RESET_BUS && (this.debug("USB bus reset initiated"), this.connectedDevice && this.connectedDevice.onReset(), this.controlDataPid = 1), value & SIE_CTRL_START_TRANS && this.startHostTransaction();
  }
  scheduleSofPacket() {
    this.sofEnabled && this.sofAlarm.schedule(1e6);
  }
  generateSOF() {
    this.sofFrameNumber = this.sofFrameNumber + 1 & 2047, this.intRaw |= INTR_HOST_SOF, this.checkInterrupts(), this.pollInterruptEndpoints(), this.scheduleSofPacket();
  }
  pollInterruptEndpoints() {
    var _a;
    this.intEpCtrl && this.sofFrameNumber % 100 === 0 && this.debug(`INT_EP poll: intEpCtrl=0x${this.intEpCtrl.toString(16)} sofFrame=${this.sofFrameNumber}`);
    for (let i = 0; i < USB_HOST_INTERRUPT_ENDPOINTS; i++) {
      let epCtrlBit = 1 << i + 1;
      if (!(this.intEpCtrl & epCtrlBit))
        continue;
      let addrEndp = this.intEpAddrCtrl[i], devAddr = addrEndp & 127, epNum = addrEndp >> 16 & 15, isOut = !!(addrEndp & 1 << 25);
      if (this.sofFrameNumber % 500 === 0 && this.debug(`INT_EP[${i}]: addrEndp=0x${addrEndp.toString(16)} devAddr=${devAddr} epNum=${epNum} connectedAddr=${(_a = this.connectedDevice) === null || _a === void 0 ? void 0 : _a.address}`), !this.connectedDevice || this.connectedDevice.address !== devAddr)
        continue;
      let epCtrlOffset = HOST_INT_EP_CTRL_BASE + i * 8, epCtrl = this.rp2040.usbDPRAMView.getUint32(epCtrlOffset, !0), interval = (epCtrl >> EP_CTRL_HOST_INTERRUPT_INTERVAL_LSB & 511) + 1;
      if (this.sofFrameNumber % interval !== 0)
        continue;
      let bufCtrlOffset = HOST_INT_EP_BUF_CTRL_BASE + i * 8, bufCtrl = this.rp2040.usbDPRAMView.getUint32(bufCtrlOffset, !0);
      if (this.sofFrameNumber % 500 === 0 && this.debug(`INT_EP[${i}]: bufCtrl=0x${bufCtrl.toString(16)} available=${!!(bufCtrl & USB_BUF_CTRL_AVAILABLE)}`), !!(bufCtrl & USB_BUF_CTRL_AVAILABLE) && !isOut) {
        let epAddr = 128 | epNum, result = this.connectedDevice.handleDataIn(epAddr);
        if (result.status === "ack" && result.data) {
          let bufferOffset = epCtrl & 65472;
          this.rp2040.usbDPRAM.set(result.data, bufferOffset);
          let newBufCtrl = bufCtrl & ~USB_BUF_CTRL_AVAILABLE;
          newBufCtrl |= USB_BUF_CTRL_FULL, newBufCtrl = newBufCtrl & ~USB_BUF_CTRL_LEN_MASK | result.data.length & USB_BUF_CTRL_LEN_MASK, this.rp2040.usbDPRAMView.setUint32(bufCtrlOffset, newBufCtrl, !0), this.buffStatus |= 1 << (i + 1) * 2, this.buffStatusUpdated();
        }
      }
    }
  }
  startHostTransaction() {
    if (!this.hostMode)
      return;
    let devAddr = this.devAddrCtrl & 127, epNum = this.devAddrCtrl >> 16 & 15;
    if (this.debug(`Host transaction: dev=${devAddr} ep=${epNum} sieCtrl=0x${this.sieCtrl.toString(16)}`), !this.connectedDevice) {
      this.sieStatus |= SIE_RX_TIMEOUT, this.sieStatusUpdated();
      return;
    }
    this.sieCtrl & SIE_CTRL_SEND_SETUP ? this.handleSetupTransaction(devAddr) : this.sieCtrl & SIE_CTRL_RECEIVE_DATA ? this.handleInTransaction(devAddr, epNum) : this.sieCtrl & SIE_CTRL_SEND_DATA && this.handleOutTransaction(devAddr, epNum);
  }
  handleSetupTransaction(_devAddr) {
    var _a, _b;
    let setupPacket = this.rp2040.usbDPRAM.slice(HOST_SETUP_PACKET, HOST_SETUP_PACKET + 8), setup = parseSetupPacket(setupPacket);
    this.debug(`SETUP: bmRequestType=0x${setup.bmRequestType.toString(16)} bRequest=${setup.bRequest} wValue=0x${setup.wValue.toString(16)} wIndex=${setup.wIndex} wLength=${setup.wLength}`);
    let result = this.connectedDevice.handleSetupPacket(setupPacket);
    if (setup.bRequest === 5 && setup.type === 0) {
      let newAddr = setup.wValue & 127;
      this.connectedDevice.address = newAddr, (_b = (_a = this.connectedDevice).onAddressAssigned) === null || _b === void 0 || _b.call(_a, newAddr), this.debug(`Device address set to ${newAddr}`);
    }
    setup.direction === "in" && result.data ? (this.pendingSetupResponse = result.data, this.expectingStatusPhase = !1) : (this.pendingSetupResponse = null, this.expectingStatusPhase = !0), this.controlDataPid = 1, this.sieStatus |= SIE_ACK_REC, this.hostTransactionAlarm.schedule(this.hostTransactionDelayMicroseconds * 1e3);
  }
  handleInTransaction(devAddr, epNum) {
    let epAddr = 128 | epNum, result;
    if (epNum === 0 && this.expectingStatusPhase)
      result = { status: "ack", data: new Uint8Array(0) }, this.expectingStatusPhase = !1, this.debug("Control OUT status phase (ZLP)");
    else if (epNum === 0 && this.pendingSetupResponse) {
      result = { status: "ack", data: this.pendingSetupResponse };
      let maxLen = this.rp2040.usbDPRAMView.getUint32(HOST_EPX_BUF_CTRL, !0) & USB_BUF_CTRL_LEN_MASK;
      result.data && result.data.length > maxLen && (result.data = result.data.slice(0, maxLen)), (!result.data || result.data.length <= maxLen) && (this.pendingSetupResponse = null);
    } else
      result = this.connectedDevice.handleDataIn(epAddr);
    if (result.status === "ack" && result.data) {
      this.rp2040.usbDPRAM.set(result.data, HOST_EPX_DATA);
      let bufCtrl = this.rp2040.usbDPRAMView.getUint32(HOST_EPX_BUF_CTRL, !0);
      bufCtrl &= ~USB_BUF_CTRL_LEN_MASK, bufCtrl |= result.data.length & USB_BUF_CTRL_LEN_MASK, bufCtrl |= USB_BUF_CTRL_FULL, bufCtrl &= ~USB_BUF_CTRL_AVAILABLE, this.controlDataPid ? bufCtrl |= USB_BUF_CTRL_DATA1_PID : bufCtrl &= ~USB_BUF_CTRL_DATA1_PID, this.controlDataPid ^= 1, this.rp2040.usbDPRAMView.setUint32(HOST_EPX_BUF_CTRL, bufCtrl, !0), this.buffStatus |= 1, this.buffStatusUpdated(), this.sieStatus |= SIE_ACK_REC;
    } else result.status === "nak" ? this.sieStatus |= SIE_NAK_REC : result.status === "stall" && (this.sieStatus |= SIE_STALL_REC);
    this.hostTransactionAlarm.schedule(this.hostTransactionDelayMicroseconds * 1e3);
  }
  handleOutTransaction(devAddr, epNum) {
    let epAddr = epNum, bufCtrl = this.rp2040.usbDPRAMView.getUint32(HOST_EPX_BUF_CTRL, !0), dataLen = bufCtrl & USB_BUF_CTRL_LEN_MASK, data = this.rp2040.usbDPRAM.slice(HOST_EPX_DATA, HOST_EPX_DATA + dataLen), result;
    epNum === 0 && dataLen === 0 ? result = { status: "ack" } : result = this.connectedDevice.handleDataOut(epAddr, data);
    let newBufCtrl = bufCtrl;
    newBufCtrl &= ~USB_BUF_CTRL_AVAILABLE, this.controlDataPid ? newBufCtrl |= USB_BUF_CTRL_DATA1_PID : newBufCtrl &= ~USB_BUF_CTRL_DATA1_PID, this.controlDataPid ^= 1, this.rp2040.usbDPRAMView.setUint32(HOST_EPX_BUF_CTRL, newBufCtrl, !0), result.status === "ack" ? (this.sieStatus |= SIE_ACK_REC, this.buffStatus |= 1, this.buffStatusUpdated()) : result.status === "nak" ? this.sieStatus |= SIE_NAK_REC : result.status === "stall" && (this.sieStatus |= SIE_STALL_REC), this.hostTransactionAlarm.schedule(this.hostTransactionDelayMicroseconds * 1e3);
  }
  completeHostTransaction() {
    this.sieCtrl &= ~SIE_CTRL_START_TRANS, this.sieStatus |= SIE_TRANS_COMPLETE, this.sieStatusUpdated(), this.debug("Host transaction complete");
  }
};

// node_modules/rp2040js/dist/esm/peripherals/watchdog.js
var CTRL2 = 0, LOAD = 4, REASON = 8, SCRATCH0 = 12, SCRATCH1 = 16, SCRATCH2 = 20, SCRATCH3 = 24, SCRATCH4 = 28, SCRATCH5 = 32, SCRATCH6 = 36, SCRATCH7 = 40, TICK = 44, TRIGGER = 1 << 31, ENABLE2 = 1 << 30, PAUSE_DBG1 = 1 << 26, PAUSE_DBG0 = 1 << 25, PAUSE_JTAG = 1 << 24, TIME_MASK = 16777215, TIME_SHIFT = 0, LOAD_MASK = 16777215, LOAD_SHIFT = 0, FORCE = 2, TIMER = 1;
var RUNNING = 1024, TICK_ENABLE = 512;
var TICK_FREQUENCY = 2e6, RPWatchdog = class extends BasePeripheral {
  // User provided
  constructor(rp2040, name) {
    super(rp2040, name), this.scratchData = new Uint32Array(8), this.enable = !1, this.tickEnable = !0, this.reason = 0, this.pauseDbg0 = !0, this.pauseDbg1 = !0, this.pauseJtag = !0, this.onWatchdogTrigger = () => {
      this.rp2040.logger.warn(this.name, "Watchdog triggered, but no reset handler provided");
    }, this.timer = new Timer32(rp2040.clock, TICK_FREQUENCY), this.timer.mode = TimerMode.Decrement, this.timer.enable = !1, this.alarm = new Timer32PeriodicAlarm(this.timer, () => {
      var _a;
      this.reason = TIMER, (_a = this.onWatchdogTrigger) === null || _a === void 0 || _a.call(this);
    }), this.alarm.target = 0, this.alarm.enable = !1;
  }
  readUint32(offset) {
    switch (offset) {
      case CTRL2:
        return (this.timer.enable ? ENABLE2 : 0) | (this.pauseDbg0 ? PAUSE_DBG0 : 0) | (this.pauseDbg1 ? PAUSE_DBG1 : 0) | (this.pauseJtag ? PAUSE_JTAG : 0) | (this.timer.counter & TIME_MASK) << TIME_SHIFT;
      case REASON:
        return this.reason;
      case SCRATCH0:
      case SCRATCH1:
      case SCRATCH2:
      case SCRATCH3:
      case SCRATCH4:
      case SCRATCH5:
      case SCRATCH6:
      case SCRATCH7:
        return this.scratchData[offset - SCRATCH0 >> 2];
      case TICK:
        return this.tickEnable ? RUNNING | TICK_ENABLE : 0;
    }
    return super.readUint32(offset);
  }
  writeUint32(offset, value) {
    var _a;
    switch (offset) {
      case CTRL2:
        value & TRIGGER && (this.reason = FORCE, (_a = this.onWatchdogTrigger) === null || _a === void 0 || _a.call(this)), this.enable = !!(value & ENABLE2), this.timer.enable = this.enable && this.tickEnable, this.alarm.enable = this.enable && this.tickEnable, this.pauseDbg0 = !!(value & PAUSE_DBG0), this.pauseDbg1 = !!(value & PAUSE_DBG1), this.pauseJtag = !!(value & PAUSE_JTAG);
        break;
      case LOAD:
        this.timer.set(value >>> LOAD_SHIFT & LOAD_MASK);
        break;
      case SCRATCH0:
      case SCRATCH1:
      case SCRATCH2:
      case SCRATCH3:
      case SCRATCH4:
      case SCRATCH5:
      case SCRATCH6:
      case SCRATCH7:
        this.scratchData[offset - SCRATCH0 >> 2] = value;
        break;
      case TICK:
        this.tickEnable = !!(value & TICK_ENABLE), this.timer.enable = this.enable && this.tickEnable, this.alarm.enable = this.enable && this.tickEnable;
        break;
      default:
        super.writeUint32(offset, value);
    }
  }
};

// node_modules/rp2040js/dist/esm/peripherals/xosc.js
var XOSC_CTRL = 0, XOSC_STATUS = 4, XOSC_DORMANT = 8, XOSC_STARTUP = 12, XOSC_COUNT = 28, CTRL_ENABLE_LSB = 12, CTRL_ENABLE_BITS = 16773120, CTRL_FREQ_RANGE_BITS = 4095, CTRL_ENABLE_DISABLE = 3358, CTRL_ENABLE_ENABLE = 4011, STATUS_STABLE = 2147483648, STATUS_BADWRITE = 16777216, STATUS_ENABLED = 4096;
var DORMANT_VALUE = 1668246881, WAKE_VALUE = 2002873189, STARTUP_X4 = 1048576, STARTUP_DELAY_BITS = 16383, RPXOSC = class extends BasePeripheral {
  constructor() {
    super(...arguments), this.ctrl = 0, this.status = 0, this.dormant = 0, this.startup = 0, this.count = 0, this.enabled = !1, this.stable = !1, this.isDormant = !1;
  }
  readUint32(offset) {
    switch (offset) {
      case XOSC_CTRL:
        return this.ctrl;
      case XOSC_STATUS: {
        let status = this.status;
        return this.stable && (status |= STATUS_STABLE), this.enabled && (status |= STATUS_ENABLED), status;
      }
      case XOSC_DORMANT:
        return this.dormant;
      case XOSC_STARTUP:
        return this.startup;
      case XOSC_COUNT:
        return this.count;
    }
    return super.readUint32(offset);
  }
  writeUint32(offset, value) {
    switch (offset) {
      case XOSC_CTRL: {
        this.ctrl = value;
        let enableValue = (value & CTRL_ENABLE_BITS) >>> CTRL_ENABLE_LSB, freqRange = value & CTRL_FREQ_RANGE_BITS;
        enableValue === CTRL_ENABLE_ENABLE ? this.isDormant || (this.enabled = !0, this.stable = !0) : enableValue === CTRL_ENABLE_DISABLE ? (this.enabled = !1, this.stable = !1) : enableValue !== 0 && (this.status |= STATUS_BADWRITE, this.warn(`Invalid ENABLE value written: 0x${enableValue.toString(16)}`));
        break;
      }
      case XOSC_STATUS:
        value & STATUS_BADWRITE && (this.status &= ~STATUS_BADWRITE);
        break;
      case XOSC_DORMANT:
        value === DORMANT_VALUE ? (this.isDormant = !0, this.stable = !1) : value === WAKE_VALUE && (this.isDormant = !1, this.enabled && (this.stable = !0)), this.dormant = value;
        break;
      case XOSC_STARTUP:
        this.startup = value & (STARTUP_X4 | STARTUP_DELAY_BITS);
        break;
      case XOSC_COUNT:
        this.count = value & 255;
        break;
      default:
        super.writeUint32(offset, value);
    }
  }
};

// node_modules/rp2040js/dist/esm/utils/bit.js
function s32(n) {
  return n | 0;
}
function u32(n) {
  return n >>> 0;
}

// node_modules/rp2040js/dist/esm/interpolator.js
var InterpolatorConfig = class {
  constructor(value) {
    this.shift = 0, this.maskLSB = 0, this.maskMSB = 0, this.signed = !1, this.crossInput = !1, this.crossResult = !1, this.addRaw = !1, this.forceMSB = 0, this.blend = !1, this.clamp = !1, this.overf0 = !1, this.overf1 = !1, this.overf = !1, this.shift = value >>> 0 & 31, this.maskLSB = value >>> 5 & 31, this.maskMSB = value >>> 10 & 31, this.signed = !!(value >>> 15 & 1), this.crossInput = !!(value >>> 16 & 1), this.crossResult = !!(value >>> 17 & 1), this.addRaw = !!(value >>> 18 & 1), this.forceMSB = value >>> 19 & 3, this.blend = !!(value >>> 21 & 1), this.clamp = !!(value >>> 22 & 1), this.overf0 = !!(value >>> 23 & 1), this.overf1 = !!(value >>> 24 & 1), this.overf = !!(value >>> 25 & 1);
  }
  toUint32() {
    return (this.shift & 31) << 0 | (this.maskLSB & 31) << 5 | (this.maskMSB & 31) << 10 | (Number(this.signed) & 1) << 15 | (Number(this.crossInput) & 1) << 16 | (Number(this.crossResult) & 1) << 17 | (Number(this.addRaw) & 1) << 18 | (this.forceMSB & 3) << 19 | (Number(this.blend) & 1) << 21 | (Number(this.clamp) & 1) << 22 | (Number(this.overf0) & 1) << 23 | (Number(this.overf1) & 1) << 24 | (Number(this.overf) & 1) << 25;
  }
}, Interpolator = class {
  constructor(index) {
    this.index = index, this.accum0 = 0, this.accum1 = 0, this.base0 = 0, this.base1 = 0, this.base2 = 0, this.ctrl0 = 0, this.ctrl1 = 0, this.result0 = 0, this.result1 = 0, this.result2 = 0, this.smresult0 = 0, this.smresult1 = 0, this.update();
  }
  update() {
    let N = this.index, ctrl0 = new InterpolatorConfig(this.ctrl0), ctrl1 = new InterpolatorConfig(this.ctrl1), do_clamp = ctrl0.clamp && N == 1, do_blend = ctrl0.blend && N == 0;
    ctrl0.clamp = do_clamp, ctrl0.blend = do_blend, ctrl1.clamp = !1, ctrl1.blend = !1, ctrl1.overf0 = !1, ctrl1.overf1 = !1, ctrl1.overf = !1;
    let input0 = s32(ctrl0.crossInput ? this.accum1 : this.accum0), input1 = s32(ctrl1.crossInput ? this.accum0 : this.accum1), msbmask0 = ctrl0.maskMSB == 31 ? 4294967295 : (1 << ctrl0.maskMSB + 1) - 1, msbmask1 = ctrl1.maskMSB == 31 ? 4294967295 : (1 << ctrl1.maskMSB + 1) - 1, mask0 = msbmask0 & ~((1 << ctrl0.maskLSB) - 1), mask1 = msbmask1 & ~((1 << ctrl1.maskLSB) - 1), uresult0 = input0 >>> ctrl0.shift & mask0, uresult1 = input1 >>> ctrl1.shift & mask1, overf0 = !!(input0 >>> ctrl0.shift & ~msbmask0), overf1 = !!(input1 >>> ctrl1.shift & ~msbmask1), overf = overf0 || overf1, sextmask0 = uresult0 & 1 << ctrl0.maskMSB ? -1 << ctrl0.maskMSB : 0, sextmask1 = uresult1 & 1 << ctrl1.maskMSB ? -1 << ctrl1.maskMSB : 0, sresult0 = uresult0 | sextmask0, sresult1 = uresult1 | sextmask1, result0 = ctrl0.signed ? sresult0 : uresult0, result1 = ctrl1.signed ? sresult1 : uresult1, addresult0 = this.base0 + (ctrl0.addRaw ? input0 : result0), addresult1 = this.base1 + (ctrl1.addRaw ? input1 : result1), addresult2 = this.base2 + result0 + (do_blend ? 0 : result1), uclamp0 = u32(result0) < u32(this.base0) ? this.base0 : u32(result0) > u32(this.base1) ? this.base1 : result0, sclamp0 = s32(result0) < s32(this.base0) ? this.base0 : s32(result0) > s32(this.base1) ? this.base1 : result0, clamp0 = ctrl0.signed ? sclamp0 : uclamp0, alpha1 = result1 & 255, ublend1 = u32(this.base0) + (Math.floor(alpha1 * (u32(this.base1) - u32(this.base0)) / 256) | 0), sblend1 = s32(this.base0) + (Math.floor(alpha1 * (s32(this.base1) - s32(this.base0)) / 256) | 0), blend1 = ctrl1.signed ? sblend1 : ublend1;
    this.smresult0 = u32(result0), this.smresult1 = u32(result1), this.result0 = u32(do_blend ? alpha1 : (do_clamp ? clamp0 : addresult0) | ctrl0.forceMSB << 28), this.result1 = u32((do_blend ? blend1 : addresult1) | ctrl0.forceMSB << 28), this.result2 = u32(addresult2), ctrl0.overf0 = overf0, ctrl0.overf1 = overf1, ctrl0.overf = overf, this.ctrl0 = ctrl0.toUint32(), this.ctrl1 = ctrl1.toUint32();
  }
  writeback() {
    let ctrl0 = new InterpolatorConfig(this.ctrl0), ctrl1 = new InterpolatorConfig(this.ctrl1);
    this.accum0 = u32(ctrl0.crossResult ? this.result1 : this.result0), this.accum1 = u32(ctrl1.crossResult ? this.result0 : this.result1), this.update();
  }
  setBase01(value) {
    let N = this.index, ctrl0 = new InterpolatorConfig(this.ctrl0), ctrl1 = new InterpolatorConfig(this.ctrl1), do_blend = ctrl0.blend && N == 0, input0 = value & 65535, input1 = value >>> 16 & 65535, sextmask0 = input0 & 32768 ? -32768 : 0, sextmask1 = input1 & 32768 ? -32768 : 0, base0 = (do_blend ? ctrl1.signed : ctrl0.signed) ? input0 | sextmask0 : input0, base1 = ctrl1.signed ? input1 | sextmask1 : input1;
    this.base0 = u32(base0), this.base1 = u32(base1), this.update();
  }
};

// node_modules/rp2040js/dist/esm/sio.js
var CPUID2 = 0, GPIO_IN = 4, GPIO_HI_IN = 8, GPIO_OUT = 16, GPIO_OUT_SET = 20, GPIO_OUT_CLR = 24, GPIO_OUT_XOR = 28, GPIO_OE = 32, GPIO_OE_SET = 36, GPIO_OE_CLR = 40, GPIO_OE_XOR = 44, GPIO_HI_OUT = 48, GPIO_HI_OUT_SET = 52, GPIO_HI_OUT_CLR = 56, GPIO_HI_OUT_XOR = 60, GPIO_HI_OE = 64, GPIO_HI_OE_SET = 68, GPIO_HI_OE_CLR = 72, GPIO_HI_OE_XOR = 76, GPIO_MASK = 1073741823, DIV_UDIVIDEND = 96, DIV_UDIVISOR = 100, DIV_SDIVIDEND = 104, DIV_SDIVISOR = 108, DIV_QUOTIENT = 112, DIV_REMAINDER = 116, DIV_CSR = 120, INTERP0_ACCUM0 = 128, INTERP0_ACCUM1 = 132, INTERP0_BASE0 = 136, INTERP0_BASE1 = 140, INTERP0_BASE2 = 144, INTERP0_POP_LANE0 = 148, INTERP0_POP_LANE1 = 152, INTERP0_POP_FULL = 156, INTERP0_PEEK_LANE0 = 160, INTERP0_PEEK_LANE1 = 164, INTERP0_PEEK_FULL = 168, INTERP0_CTRL_LANE0 = 172, INTERP0_CTRL_LANE1 = 176, INTERP0_ACCUM0_ADD = 180, INTERP0_ACCUM1_ADD = 184, INTERP0_BASE_1AND0 = 188, INTERP1_ACCUM0 = 192, INTERP1_ACCUM1 = 196, INTERP1_BASE0 = 200, INTERP1_BASE1 = 204, INTERP1_BASE2 = 208, INTERP1_POP_LANE0 = 212, INTERP1_POP_LANE1 = 216, INTERP1_POP_FULL = 220, INTERP1_PEEK_LANE0 = 224, INTERP1_PEEK_LANE1 = 228, INTERP1_PEEK_FULL = 232, INTERP1_CTRL_LANE0 = 236, INTERP1_CTRL_LANE1 = 240, INTERP1_ACCUM0_ADD = 244, INTERP1_ACCUM1_ADD = 248, INTERP1_BASE_1AND0 = 252, SPINLOCK_ST = 92, SPINLOCK0 = 256, SPINLOCK31 = 380, RPSIO = class {
  constructor(rp2040) {
    this.rp2040 = rp2040, this.gpioValue = 0, this.gpioOutputEnable = 0, this.qspiGpioValue = 0, this.qspiGpioOutputEnable = 0, this.divDividend = 0, this.divDivisor = 1, this.divQuotient = 0, this.divRemainder = 0, this.divCSR = 0, this.spinLock = 0, this.interp0 = new Interpolator(0), this.interp1 = new Interpolator(1);
  }
  updateHardwareDivider(signed) {
    this.divDivisor == 0 ? (this.divQuotient = this.divDividend > 0 ? -1 : 1, this.divRemainder = this.divDividend) : signed ? (this.divQuotient = (this.divDividend | 0) / (this.divDivisor | 0), this.divRemainder = (this.divDividend | 0) % (this.divDivisor | 0)) : (this.divQuotient = (this.divDividend >>> 0) / (this.divDivisor >>> 0), this.divRemainder = (this.divDividend >>> 0) % (this.divDivisor >>> 0)), this.divCSR = 3, this.rp2040.core.cycles += 8;
  }
  readUint32(offset) {
    if (offset >= SPINLOCK0 && offset <= SPINLOCK31) {
      let bitIndexMask = 1 << (offset - SPINLOCK0) / 4;
      return this.spinLock & bitIndexMask ? 0 : (this.spinLock |= bitIndexMask, bitIndexMask);
    }
    switch (offset) {
      case GPIO_IN:
        return this.rp2040.gpioValues;
      case GPIO_HI_IN: {
        let { qspi } = this.rp2040, result = 0;
        for (let qspiIndex = 0; qspiIndex < qspi.length; qspiIndex++)
          qspi[qspiIndex].inputValue && (result |= 1 << qspiIndex);
        return result;
      }
      case GPIO_OUT:
        return this.gpioValue;
      case GPIO_OE:
        return this.gpioOutputEnable;
      case GPIO_HI_OUT:
        return this.qspiGpioValue;
      case GPIO_HI_OE:
        return this.qspiGpioOutputEnable;
      case GPIO_OUT_SET:
      case GPIO_OUT_CLR:
      case GPIO_OUT_XOR:
      case GPIO_OE_SET:
      case GPIO_OE_CLR:
      case GPIO_OE_XOR:
      case GPIO_HI_OUT_SET:
      case GPIO_HI_OUT_CLR:
      case GPIO_HI_OUT_XOR:
      case GPIO_HI_OE_SET:
      case GPIO_HI_OE_CLR:
      case GPIO_HI_OE_XOR:
        return 0;
      // TODO verify with silicone
      case CPUID2:
        return 0;
      case SPINLOCK_ST:
        return this.spinLock;
      case DIV_UDIVIDEND:
        return this.divDividend;
      case DIV_SDIVIDEND:
        return this.divDividend;
      case DIV_UDIVISOR:
        return this.divDivisor;
      case DIV_SDIVISOR:
        return this.divDivisor;
      case DIV_QUOTIENT:
        return this.divCSR &= -3, this.divQuotient;
      case DIV_REMAINDER:
        return this.divRemainder;
      case DIV_CSR:
        return this.divCSR;
      case INTERP0_ACCUM0:
        return this.interp0.accum0;
      case INTERP0_ACCUM1:
        return this.interp0.accum1;
      case INTERP0_BASE0:
        return this.interp0.base0;
      case INTERP0_BASE1:
        return this.interp0.base1;
      case INTERP0_BASE2:
        return this.interp0.base2;
      case INTERP0_CTRL_LANE0:
        return this.interp0.ctrl0;
      case INTERP0_CTRL_LANE1:
        return this.interp0.ctrl1;
      case INTERP0_PEEK_LANE0:
        return this.interp0.result0;
      case INTERP0_PEEK_LANE1:
        return this.interp0.result1;
      case INTERP0_PEEK_FULL:
        return this.interp0.result2;
      case INTERP0_POP_LANE0: {
        let value = this.interp0.result0;
        return this.interp0.writeback(), value;
      }
      case INTERP0_POP_LANE1: {
        let value = this.interp0.result1;
        return this.interp0.writeback(), value;
      }
      case INTERP0_POP_FULL: {
        let value = this.interp0.result2;
        return this.interp0.writeback(), value;
      }
      case INTERP0_ACCUM0_ADD:
        return this.interp0.smresult0;
      case INTERP0_ACCUM1_ADD:
        return this.interp0.smresult1;
      case INTERP1_ACCUM0:
        return this.interp1.accum0;
      case INTERP1_ACCUM1:
        return this.interp1.accum1;
      case INTERP1_BASE0:
        return this.interp1.base0;
      case INTERP1_BASE1:
        return this.interp1.base1;
      case INTERP1_BASE2:
        return this.interp1.base2;
      case INTERP1_CTRL_LANE0:
        return this.interp1.ctrl0;
      case INTERP1_CTRL_LANE1:
        return this.interp1.ctrl1;
      case INTERP1_PEEK_LANE0:
        return this.interp1.result0;
      case INTERP1_PEEK_LANE1:
        return this.interp1.result1;
      case INTERP1_PEEK_FULL:
        return this.interp1.result2;
      case INTERP1_POP_LANE0: {
        let value = this.interp1.result0;
        return this.interp1.writeback(), value;
      }
      case INTERP1_POP_LANE1: {
        let value = this.interp1.result1;
        return this.interp1.writeback(), value;
      }
      case INTERP1_POP_FULL: {
        let value = this.interp1.result2;
        return this.interp1.writeback(), value;
      }
      case INTERP1_ACCUM0_ADD:
        return this.interp1.smresult0;
      case INTERP1_ACCUM1_ADD:
        return this.interp1.smresult1;
    }
    return console.warn(`Read from invalid SIO address: ${offset.toString(16)}`), 4294967295;
  }
  writeUint32(offset, value) {
    if (offset >= SPINLOCK0 && offset <= SPINLOCK31) {
      let bitIndexMask = ~(1 << (offset - SPINLOCK0) / 4);
      this.spinLock &= bitIndexMask;
      return;
    }
    let prevGpioValue = this.gpioValue, prevGpioOutputEnable = this.gpioOutputEnable;
    switch (offset) {
      case GPIO_OUT:
        this.gpioValue = value & GPIO_MASK;
        break;
      case GPIO_OUT_SET:
        this.gpioValue |= value & GPIO_MASK;
        break;
      case GPIO_OUT_CLR:
        this.gpioValue &= ~value;
        break;
      case GPIO_OUT_XOR:
        this.gpioValue ^= value & GPIO_MASK;
        break;
      case GPIO_OE:
        this.gpioOutputEnable = value & GPIO_MASK;
        break;
      case GPIO_OE_SET:
        this.gpioOutputEnable |= value & GPIO_MASK;
        break;
      case GPIO_OE_CLR:
        this.gpioOutputEnable &= ~value;
        break;
      case GPIO_OE_XOR:
        this.gpioOutputEnable ^= value & GPIO_MASK;
        break;
      case GPIO_HI_OUT:
        this.qspiGpioValue = value & GPIO_MASK;
        break;
      case GPIO_HI_OUT_SET:
        this.qspiGpioValue |= value & GPIO_MASK;
        break;
      case GPIO_HI_OUT_CLR:
        this.qspiGpioValue &= ~value;
        break;
      case GPIO_HI_OUT_XOR:
        this.qspiGpioValue ^= value & GPIO_MASK;
        break;
      case GPIO_HI_OE:
        this.qspiGpioOutputEnable = value & GPIO_MASK;
        break;
      case GPIO_HI_OE_SET:
        this.qspiGpioOutputEnable |= value & GPIO_MASK;
        break;
      case GPIO_HI_OE_CLR:
        this.qspiGpioOutputEnable &= ~value;
        break;
      case GPIO_HI_OE_XOR:
        this.qspiGpioOutputEnable ^= value & GPIO_MASK;
        break;
      case DIV_UDIVIDEND:
        this.divDividend = value, this.updateHardwareDivider(!1);
        break;
      case DIV_SDIVIDEND:
        this.divDividend = value, this.updateHardwareDivider(!0);
        break;
      case DIV_UDIVISOR:
        this.divDivisor = value, this.updateHardwareDivider(!1);
        break;
      case DIV_SDIVISOR:
        this.divDivisor = value, this.updateHardwareDivider(!0);
        break;
      case DIV_QUOTIENT:
        this.divQuotient = value, this.divCSR = 3;
        break;
      case DIV_REMAINDER:
        this.divRemainder = value, this.divCSR = 3;
        break;
      case INTERP0_ACCUM0:
        this.interp0.accum0 = value, this.interp0.update();
        break;
      case INTERP0_ACCUM1:
        this.interp0.accum1 = value, this.interp0.update();
        break;
      case INTERP0_BASE0:
        this.interp0.base0 = value, this.interp0.update();
        break;
      case INTERP0_BASE1:
        this.interp0.base1 = value, this.interp0.update();
        break;
      case INTERP0_BASE2:
        this.interp0.base2 = value, this.interp0.update();
        break;
      case INTERP0_CTRL_LANE0:
        this.interp0.ctrl0 = value, this.interp0.update();
        break;
      case INTERP0_CTRL_LANE1:
        this.interp0.ctrl1 = value, this.interp0.update();
        break;
      case INTERP0_ACCUM0_ADD:
        this.interp0.accum0 += value, this.interp0.update();
        break;
      case INTERP0_ACCUM1_ADD:
        this.interp0.accum1 += value, this.interp0.update();
        break;
      case INTERP0_BASE_1AND0:
        this.interp0.setBase01(value);
        break;
      case INTERP1_ACCUM0:
        this.interp1.accum0 = value, this.interp1.update();
        break;
      case INTERP1_ACCUM1:
        this.interp1.accum1 = value, this.interp1.update();
        break;
      case INTERP1_BASE0:
        this.interp1.base0 = value, this.interp1.update();
        break;
      case INTERP1_BASE1:
        this.interp1.base1 = value, this.interp1.update();
        break;
      case INTERP1_BASE2:
        this.interp1.base2 = value, this.interp1.update();
        break;
      case INTERP1_CTRL_LANE0:
        this.interp1.ctrl0 = value, this.interp1.update();
        break;
      case INTERP1_CTRL_LANE1:
        this.interp1.ctrl1 = value, this.interp1.update();
        break;
      case INTERP1_ACCUM0_ADD:
        this.interp1.accum0 += value, this.interp1.update();
        break;
      case INTERP1_ACCUM1_ADD:
        this.interp1.accum1 += value, this.interp1.update();
        break;
      case INTERP1_BASE_1AND0:
        this.interp1.setBase01(value);
        break;
      default:
        console.warn(`Write to invalid SIO address: ${offset.toString(16)}, value=${value.toString(16)}`);
    }
    let pinsToUpdate = this.gpioValue ^ prevGpioValue | this.gpioOutputEnable ^ prevGpioOutputEnable;
    if (pinsToUpdate) {
      let { gpio } = this.rp2040;
      for (let gpioIndex = 0; gpioIndex < gpio.length; gpioIndex++)
        pinsToUpdate & 1 << gpioIndex && gpio[gpioIndex].checkForUpdates();
    }
  }
};

// node_modules/rp2040js/dist/esm/utils/time.js
function getCurrentMicroseconds() {
  return Math.floor(typeof performance < "u" ? performance.now() * 1e3 : eval("require")("perf_hooks").performance.now() * 1e3);
}
function leftPad(value, minLength, padChar = " ") {
  return value.length < minLength && (value = padChar + value), value;
}
function rightPad(value, minLength, padChar = " ") {
  return value.length < minLength && (value += padChar), value;
}
function formatTime(date) {
  let hours = leftPad(date.getHours().toString(), 2, "0"), minutes = leftPad(date.getMinutes().toString(), 2, "0"), seconds = leftPad(date.getSeconds().toString(), 2, "0"), milliseconds = rightPad(date.getMilliseconds().toString(), 3);
  return `${hours}:${minutes}:${seconds}.${milliseconds}`;
}

// node_modules/rp2040js/dist/esm/utils/logging.js
var LogLevel;
(function(LogLevel2) {
  LogLevel2[LogLevel2.Debug = 0] = "Debug", LogLevel2[LogLevel2.Info = 1] = "Info", LogLevel2[LogLevel2.Warn = 2] = "Warn", LogLevel2[LogLevel2.Error = 3] = "Error";
})(LogLevel || (LogLevel = {}));
var ConsoleLogger = class {
  constructor(currentLogLevel, throwOnError = !0) {
    this.currentLogLevel = currentLogLevel, this.throwOnError = throwOnError;
  }
  aboveLogLevel(logLevel) {
    return logLevel >= this.currentLogLevel;
  }
  formatMessage(componentName, message) {
    return `${formatTime(/* @__PURE__ */ new Date())} [${componentName}] ${message}`;
  }
  debug(componetName, message) {
    this.aboveLogLevel(LogLevel.Debug) && console.debug(this.formatMessage(componetName, message));
  }
  warn(componetName, message) {
    this.aboveLogLevel(LogLevel.Warn) && console.warn(this.formatMessage(componetName, message));
  }
  error(componentName, message) {
    if (this.aboveLogLevel(LogLevel.Error) && (console.error(this.formatMessage(componentName, message)), this.throwOnError))
      throw new Error(`[${componentName}] ${message}`);
  }
  info(componentName, message) {
    this.aboveLogLevel(LogLevel.Info) && console.info(this.formatMessage(componentName, message));
  }
};

// node_modules/rp2040js/dist/esm/rp2040.js
var FLASH_START_ADDRESS = 268435456, FLASH_END_ADDRESS = 335544320, RAM_START_ADDRESS = 536870912, APB_START_ADDRESS = 1073741824, DPRAM_START_ADDRESS = 1343225856, SIO_START_ADDRESS = 3489660928, LOG_NAME2 = "RP2040", KB = 1024, MB = 1024 * KB, MHz = 1e6, RP2040 = class {
  constructor(clock = new SimulationClock()) {
    this.clock = clock, this.bootrom = new Uint32Array(4 * KB), this.sram = new Uint8Array(264 * KB), this.sramView = new DataView(this.sram.buffer), this.flash = new Uint8Array(16 * MB), this.flash16 = new Uint16Array(this.flash.buffer), this.flashView = new DataView(this.flash.buffer), this.usbDPRAM = new Uint8Array(4 * KB), this.usbDPRAMView = new DataView(this.usbDPRAM.buffer), this.core = new CortexM0Core(this), this.clkSys = 125 * MHz, this.clkPeri = 125 * MHz, this.xoscFreq = 12 * MHz, this.roscFreq = 6.5 * MHz, this.pllSys = new RPPLL(this, "PLL_SYS_BASE"), this.pllUsb = new RPPLL(this, "PLL_USB_BASE"), this.clocks = new RPClocks(this, "CLOCKS_BASE"), this.ppb = new RPPPB(this, "PPB"), this.sio = new RPSIO(this), this.uart = [
      new RPUART(this, "UART0", IRQ.UART0, {
        rx: DREQChannel.DREQ_UART0_RX,
        tx: DREQChannel.DREQ_UART0_TX
      }),
      new RPUART(this, "UART1", IRQ.UART1, {
        rx: DREQChannel.DREQ_UART1_RX,
        tx: DREQChannel.DREQ_UART1_TX
      })
    ], this.i2c = [new RPI2C(this, "I2C0", IRQ.I2C0), new RPI2C(this, "I2C1", IRQ.I2C1)], this.pwm = new RPPWM(this, "PWM_BASE"), this.adc = new RPADC(this, "ADC"), this.gpio = [
      new GPIOPin(this, 0),
      new GPIOPin(this, 1),
      new GPIOPin(this, 2),
      new GPIOPin(this, 3),
      new GPIOPin(this, 4),
      new GPIOPin(this, 5),
      new GPIOPin(this, 6),
      new GPIOPin(this, 7),
      new GPIOPin(this, 8),
      new GPIOPin(this, 9),
      new GPIOPin(this, 10),
      new GPIOPin(this, 11),
      new GPIOPin(this, 12),
      new GPIOPin(this, 13),
      new GPIOPin(this, 14),
      new GPIOPin(this, 15),
      new GPIOPin(this, 16),
      new GPIOPin(this, 17),
      new GPIOPin(this, 18),
      new GPIOPin(this, 19),
      new GPIOPin(this, 20),
      new GPIOPin(this, 21),
      new GPIOPin(this, 22),
      new GPIOPin(this, 23),
      new GPIOPin(this, 24),
      new GPIOPin(this, 25),
      new GPIOPin(this, 26),
      new GPIOPin(this, 27),
      new GPIOPin(this, 28),
      new GPIOPin(this, 29)
    ], this.qspi = [
      new GPIOPin(this, 0, "SCLK"),
      new GPIOPin(this, 1, "SS"),
      new GPIOPin(this, 2, "SD0"),
      new GPIOPin(this, 3, "SD1"),
      new GPIOPin(this, 4, "SD2"),
      new GPIOPin(this, 5, "SD3")
    ], this.dma = new RPDMA(this, "DMA"), this.pio = [
      new RPPIO(this, "PIO0", IRQ.PIO0_IRQ0, 0),
      new RPPIO(this, "PIO1", IRQ.PIO1_IRQ0, 1)
    ], this.usbCtrl = new RPUSBController(this, "USB"), this.spi = [
      new RPSPI(this, "SPI0", IRQ.SPI0, {
        rx: DREQChannel.DREQ_SPI0_RX,
        tx: DREQChannel.DREQ_SPI0_TX
      }),
      new RPSPI(this, "SPI1", IRQ.SPI1, {
        rx: DREQChannel.DREQ_SPI1_RX,
        tx: DREQChannel.DREQ_SPI1_TX
      })
    ], this.logger = new ConsoleLogger(LogLevel.Debug, !0), this.clockListeners = /* @__PURE__ */ new Set(), this.peripherals = {
      98304: new RPSSI(this, "SSI"),
      262144: new RP2040SysInfo(this, "SYSINFO_BASE"),
      262148: new RP2040SysCfg(this, "SYSCFG"),
      262152: this.clocks,
      262156: new RPReset(this, "RESETS_BASE"),
      262160: new RPPSM(this, "PSM_BASE"),
      262164: new RPIO(this, "IO_BANK0_BASE"),
      262168: new UnimplementedPeripheral(this, "IO_QSPI_BASE"),
      262172: new RPPADS(this, "PADS_BANK0_BASE", "bank0"),
      262176: new RPPADS(this, "PADS_QSPI_BASE", "qspi"),
      262180: new RPXOSC(this, "XOSC_BASE"),
      262184: this.pllSys,
      262188: this.pllUsb,
      262192: new RPBUSCTRL(this, "BUSCTRL_BASE"),
      262196: this.uart[0],
      262200: this.uart[1],
      262204: this.spi[0],
      262208: this.spi[1],
      262212: this.i2c[0],
      262216: this.i2c[1],
      262220: this.adc,
      262224: this.pwm,
      262228: new RPTimer(this, "TIMER_BASE"),
      262232: new RPWatchdog(this, "WATCHDOG_BASE"),
      262236: new RP2040RTC(this, "RTC_BASE"),
      262240: new UnimplementedPeripheral(this, "ROSC_BASE"),
      262244: new UnimplementedPeripheral(this, "VREG_AND_CHIP_RESET_BASE"),
      262252: new RPTBMAN(this, "TBMAN_BASE"),
      327680: this.dma,
      327952: this.usbCtrl,
      328192: this.pio[0],
      328448: this.pio[1]
    }, this.onBreak = (code) => {
    }, this.reset();
  }
  loadBootrom(bootromData) {
    this.bootrom.set(bootromData), this.reset();
  }
  reset() {
    this.core.reset(), this.pwm.reset(), this.flash.fill(255);
  }
  readUint32(address) {
    address = address >>> 0, address & 3 && this.logger.error(LOG_NAME2, `read from address ${address.toString(16)}, which is not 32 bit aligned`);
    let { bootrom } = this;
    if (address < bootrom.length * 4)
      return bootrom[address / 4];
    if (address >= FLASH_START_ADDRESS && address < FLASH_END_ADDRESS) {
      let offset = address & 16777215;
      return this.flashView.getUint32(offset, !0);
    } else {
      if (address >= RAM_START_ADDRESS && address < RAM_START_ADDRESS + this.sram.length)
        return this.sramView.getUint32(address - RAM_START_ADDRESS, !0);
      if (address >= DPRAM_START_ADDRESS && address < DPRAM_START_ADDRESS + this.usbDPRAM.length)
        return this.usbDPRAMView.getUint32(address - DPRAM_START_ADDRESS, !0);
      if (address >>> 12 === 917518)
        return this.ppb.readUint32(address & 4095);
      if (address >= SIO_START_ADDRESS && address < SIO_START_ADDRESS + 268435456)
        return this.sio.readUint32(address - SIO_START_ADDRESS);
    }
    let peripheral = this.findPeripheral(address);
    return peripheral ? peripheral.readUint32(address & 16383) : (this.logger.warn(LOG_NAME2, `Read from invalid memory address: ${address.toString(16)}`), 4294967295);
  }
  /**
   * Recomputes `clkSys` and `clkPeri` from the PLL and CLOCKS registers and updates the
   * peripherals derived from them. Until firmware configures the clock tree, each keeps its default.
   */
  updateClocks() {
    this.updateClkSys(), this.updateClkPeri();
  }
  updateClkSys() {
    let clkSys = this.clocks.sysFreq;
    if (!clkSys || clkSys === this.clkSys)
      return;
    let oldClkSys = this.clkSys;
    this.clkSys = clkSys, this.ppb.systickTimer.frequency = clkSys;
    for (let channel of this.pwm.channels)
      channel.timer.frequency = this.pwm.clockFreq;
    for (let listener of this.clockListeners)
      listener(clkSys, oldClkSys);
  }
  updateClkPeri() {
    let clkPeri = this.clocks.periFreq;
    if (!(!clkPeri || clkPeri === this.clkPeri)) {
      this.clkPeri = clkPeri;
      for (let uart of this.uart)
        uart.clkPeriChanged();
    }
  }
  /** Registers a listener to be notified whenever clk_sys changes. Returns an unsubscribe function. */
  addClockListener(listener) {
    return this.clockListeners.add(listener), () => this.clockListeners.delete(listener);
  }
  findPeripheral(address) {
    return this.peripherals[address >>> 14 << 2];
  }
  /** We assume the address is 16-bit aligned */
  readUint16(address) {
    if (address >= FLASH_START_ADDRESS && address < FLASH_START_ADDRESS + this.flash.length)
      return this.flashView.getUint16(address - FLASH_START_ADDRESS, !0);
    if (address >= RAM_START_ADDRESS && address < RAM_START_ADDRESS + this.sram.length)
      return this.sramView.getUint16(address - RAM_START_ADDRESS, !0);
    let value = this.readUint32(address & 4294967292);
    return address & 2 ? (value & 4294901760) >>> 16 : value & 65535;
  }
  readUint8(address) {
    if (address >= FLASH_START_ADDRESS && address < FLASH_START_ADDRESS + this.flash.length)
      return this.flash[address - FLASH_START_ADDRESS];
    if (address >= RAM_START_ADDRESS && address < RAM_START_ADDRESS + this.sram.length)
      return this.sram[address - RAM_START_ADDRESS];
    let value = this.readUint16(address & 4294967294);
    return (address & 1 ? (value & 65280) >>> 8 : value & 255) >>> 0;
  }
  writeUint32(address, value) {
    address = address >>> 0;
    let { bootrom } = this, peripheral = this.findPeripheral(address);
    if (peripheral) {
      let atomicType = (address & 12288) >> 12, offset = address & 4095;
      peripheral.writeUint32Atomic(offset, value, atomicType);
    } else if (address < bootrom.length * 4)
      bootrom[address / 4] = value;
    else if (address >= FLASH_START_ADDRESS && address < FLASH_START_ADDRESS + this.flash.length)
      this.flashView.setUint32(address - FLASH_START_ADDRESS, value, !0);
    else if (address >= RAM_START_ADDRESS && address < RAM_START_ADDRESS + this.sram.length)
      this.sramView.setUint32(address - RAM_START_ADDRESS, value, !0);
    else if (address >= DPRAM_START_ADDRESS && address < DPRAM_START_ADDRESS + this.usbDPRAM.length) {
      let offset = address - DPRAM_START_ADDRESS;
      this.usbDPRAMView.setUint32(offset, value, !0), this.usbCtrl.DPRAMUpdated(offset, value);
    } else address >= SIO_START_ADDRESS && address < SIO_START_ADDRESS + 268435456 ? this.sio.writeUint32(address - SIO_START_ADDRESS, value) : address >>> 12 === 917518 ? this.ppb.writeUint32(address & 4095, value) : this.logger.warn(LOG_NAME2, `Write to undefined address: ${address.toString(16)}`);
  }
  writeUint8(address, value) {
    if (address >= RAM_START_ADDRESS && address < RAM_START_ADDRESS + this.sram.length) {
      this.sram[address - RAM_START_ADDRESS] = value;
      return;
    }
    let alignedAddress = (address & 4294967292) >>> 0, offset = address & 3, peripheral = this.findPeripheral(address);
    if (peripheral) {
      let atomicType = (alignedAddress & 12288) >> 12, offset2 = alignedAddress & 4095;
      peripheral.writeUint32Atomic(offset2, value & 255 | (value & 255) << 8 | (value & 255) << 16 | (value & 255) << 24, atomicType);
      return;
    }
    let originalValue = this.readUint32(alignedAddress), newValue = new Uint32Array([originalValue]);
    new DataView(newValue.buffer).setUint8(offset, value), this.writeUint32(alignedAddress, newValue[0]);
  }
  writeUint16(address, value) {
    if (address >= RAM_START_ADDRESS && address < RAM_START_ADDRESS + this.sram.length) {
      this.sramView.setUint16(address - RAM_START_ADDRESS, value, !0);
      return;
    }
    let alignedAddress = (address & 4294967292) >>> 0, offset = address & 3, peripheral = this.findPeripheral(address);
    if (peripheral) {
      let atomicType = (alignedAddress & 12288) >> 12, offset2 = alignedAddress & 4095;
      peripheral.writeUint32Atomic(offset2, value & 65535 | (value & 65535) << 16, atomicType);
      return;
    }
    let originalValue = this.readUint32(alignedAddress), newValue = new Uint32Array([originalValue]);
    new DataView(newValue.buffer).setUint16(offset, value, !0), this.writeUint32(alignedAddress, newValue[0]);
  }
  get gpioValues() {
    let { gpio } = this, result = 0;
    for (let gpioIndex = 0; gpioIndex < gpio.length; gpioIndex++)
      gpio[gpioIndex].inputValue && (result |= 1 << gpioIndex);
    return result;
  }
  setInterrupt(irq, value) {
    this.core.setInterrupt(irq, value);
  }
  updateIOInterrupt() {
    let interruptValue = !1;
    for (let pin of this.gpio)
      pin.irqValue && (interruptValue = !0);
    this.setInterrupt(IRQ.IO_BANK0, interruptValue);
  }
  step() {
    this.core.executeInstruction();
  }
};
export {
  ConsoleLogger,
  I2CMode,
  LogLevel,
  RP2040,
  SimulationClock
};

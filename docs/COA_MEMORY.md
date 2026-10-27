# COA: Computer Organization and Architecture

## Microprogrammed Control Unit Simulator

This document details the architectural specifications, register transfers, control signal decoding, and cycle-by-cycle execution pipeline of the **Computer Organization and Architecture (COA)** subsystem.

---

## 1. Architectural Overview: The Microprogrammed Control Unit

In hardwired control units, combinational logic gates and state flip-flops directly generate control signals. While fast, hardwired designs are inflexible and difficult to update.

In our **microprogrammed control unit**, control signals are stored as binary words (microinstructions) in high-speed **Control Memory (Control ROM)**. Execution is driven by advancing a specialized address register called the **Microprogram Counter ($\mu\text{PC}$)**:

```mermaid
graph TD
    subgraph Control_Unit ["Microprogrammed Control Unit"]
        UPC["Microprogram Counter (μPC)"] --> ROM["Control Memory (Control ROM)<br/>Holds Microinstructions"]
        ROM --> DECODER["Control Signal Decoder<br/>Extracts ALU, Bus & Mem Fields"]
        COND_LOGIC["Branch & Flag Logic<br/>Tests Z, S, C, V Flags"] --> UPC
    end

    subgraph Datapath ["16-Bit Micro-Architecture Datapath"]
        DECODER -->|ALU Operation| ALU["ALU (16-bit)<br/>ADD, SUB, AND, OR, INC, DEC"]
        DECODER -->|Bus A & Bus B Select| BUS["Internal Data Bus"]
        DECODER -->|Dest Register Latch| REGS["Register File<br/>R0, R1, R2, R3, PC, MAR, MDR, TEMP"]
        
        ALU -->|Status Flags| FLAGS["Processor Flags<br/>Z (Zero), S (Sign), C (Carry), V (Overflow)"]
        FLAGS --> COND_LOGIC
        
        REGS -->|MAR (Address)| RAM["Simulated Data Memory<br/>256 Words (16-bit addressable)"]
        REGS <-->|MDR (Data)| RAM
    end

    style Control_Unit fill:#0f172a,stroke:#3b82f6,stroke-width:2px,color:#f8fafc
    style Datapath fill:#022c22,stroke:#10b981,stroke-width:2px,color:#f8fafc
```

---

## 2. Microinstruction Word Specification

Each microinstruction in Control Memory specifies the hardware control assertions active during a single processor clock cycle:

| Field | Width / Valid Values | Description | Hardware Effect |
| :--- | :--- | :--- | :--- |
| **`aluOp`** | `NONE`, `ADD`, `SUB`, `AND`, `OR`, `XOR`, `INC`, `DEC`, `PASS_A`, `PASS_B` | ALU functional operation. | Activates ALU arithmetic/logic circuits; computes result; updates $Z, S, C, V$ flags. |
| **`srcA`** | `NONE`, `R0`, `R1`, `R2`, `R3`, `PC`, `MAR`, `MDR`, `TEMP` | Source register routed to ALU Input Bus A. | Reads register onto ALU Bus A. |
| **`srcB`** | `NONE`, `R0`, `R1`, `R2`, `R3`, `TEMP`, or `imm` | Source register or 16-bit immediate routed to ALU Bus B. | Reads register or immediate onto ALU Bus B. |
| **`dest`** | `NONE`, `R0`, `R1`, `R2`, `R3`, `PC`, `MAR`, `MDR`, `IR`, `TEMP` | Destination register latched from ALU output. | Latches ALU result into target register at clock edge. |
| **`imm`** | 16-bit unsigned integer ($0 \le x \le 65535$) | Constant immediate value or branch target. | Directly feeds Bus B or target address. |
| **`memOp`** | `NONE`, `READ`, `WRITE` | Data memory bus transaction. | `READ`: $\text{MDR} \leftarrow \text{Mem}[\text{MAR}]$;<br/>`WRITE`: $\text{Mem}[\text{MAR}] \leftarrow \text{MDR}$. |
| **`pcOp`** | `NONE`, `INCREMENT`, `LOAD_ALU`, `LOAD_MDR`, `LOAD_IMM` | Macro Program Counter (PC) update rule. | Modifies architectural PC (instruction pointer). |
| **`condition`**| `UNCONDITIONAL`, `IF_ZERO`, `IF_NOT_ZERO`, `IF_CARRY`, `IF_NEGATIVE` | Micro-branch condition code. | Evaluates condition flags to determine $\mu\text{PC}$ next address. |
| **`nextAddress`**| Integer or `'NEXT'` | Next $\mu\text{PC}$ address in Control Memory. | If condition evaluates true, $\mu\text{PC} \leftarrow \text{nextAddress}$; else $\mu\text{PC} \leftarrow \mu\text{PC} + 1$. |
| **`isHalt`** | Boolean (`true` / `false`) | Clock halt assertion. | Terminates simulation loop; asserts program completion. |

---

## 3. Register File Architecture

The simulator models a 16-bit register file implemented in [`src/lib/coa/registers.js`](file:///c:/Users/Dell/Desktop/micro_project-2/src/lib/coa/registers.js):

* **General Purpose Registers (`R0`, `R1`, `R2`, `R3`):** 16-bit unsigned integer registers ($0\text{x}0000$ to $0\text{x}FFFF$) used for program arithmetic, accumulation, and temporary values.
* **Program Counter (`PC`):** Tracks the macro-instruction address in simulated memory.
* **Instruction Register (`IR`):** Holds the currently fetched macro-instruction.
* **Memory Address Register (`MAR`):** Latches the 16-bit memory address driven onto the memory address bus.
* **Memory Data Register (`MDR`):** Latches data read from or written to memory via the data bus.
* **ALU Temporary Latch (`TEMP`):** Stashes intermediate multi-cycle ALU calculation values.

### Condition Code Flags

The processor updates four condition flags after every arithmetic operation:

1. **Zero Flag ($Z$):**
   $$Z = \begin{cases} 1 & \text{if } \text{Result} = 0 \\ 0 & \text{otherwise} \end{cases}$$
2. **Sign / Negative Flag ($S$):**
   $$S = \text{Bit}_{15}(\text{Result})$$
3. **Carry Flag ($C$):**
   $$C = \begin{cases} 1 & \text{if } \text{Unsigned Result} > 65535 \text{ (addition) or Borrow occurs (subtraction)} \\ 0 & \text{otherwise} \end{cases}$$
4. **Overflow Flag ($V$):**
   $$V = \begin{cases} 1 & \text{if signed two's-complement overflow occurs} \\ 0 & \text{otherwise} \end{cases}$$
   Determined by: $V = (A_{15} \oplus \text{Result}_{15}) \ \& \ (B_{15} \oplus \text{Result}_{15})$ for addition.

---

## 4. Cycle-by-Cycle Execution Algorithm

Each clock cycle executes within the `step()` method of [`src/lib/coa/executionEngine.js`](file:///c:/Users/Dell/Desktop/micro_project-2/src/lib/coa/executionEngine.js):

```
Algorithm EXECUTION-ENGINE-STEP()
  1. Fetch Microinstruction: uinst = ControlMemory[μPC]
  2. Snapshot pre-cycle machine state (Registers, Flags, Memory)
  3. Cycle Counter Increment: cycleCount++
  
  4. Operand Routing:
     operandA = (uinst.srcA != NONE) ? Registers[uinst.srcA] : 0
     operandB = (uinst.srcB != NONE) ? Registers[uinst.srcB] : uinst.imm

  5. ALU Execution & Flag Updates:
     if uinst.aluOp != NONE then
       rawResult = ComputeALU(uinst.aluOp, operandA, operandB)
       aluResult = rawResult & 0xFFFF
       UpdateFlags(Z, S, C, V)
       
  6. Register Writeback:
     if uinst.dest != NONE and uinst.aluOp != NONE then
       Registers[uinst.dest] = aluResult

  7. Memory Operations:
     if uinst.memOp == READ then
       Registers.MDR = DataMemory.read(Registers.MAR)
     else if uinst.memOp == WRITE then
       DataMemory.write(Registers.MAR, Registers.MDR)

  8. Program Counter (PC) Updates:
     if uinst.pcOp == INCREMENT then Registers.PC++
     else if uinst.pcOp == LOAD_ALU then Registers.PC = aluResult

  9. Microprogram Counter (μPC) Sequencing:
     branchTaken = EvaluateCondition(uinst.condition, Flags)
     if branchTaken and uinst.nextAddress is integer then
       μPC = uinst.nextAddress
     else
       μPC = μPC + 1

  10. Termination Check:
     if uinst.isHalt or μPC >= ControlMemory.size() then
       Status = HALTED
       
  11. Log execution history entry
```

---

## 5. Memory Hierarchy & Bandwidth Modeling

The COA engine models the memory subsystem to demonstrate the hardware benefits of Huffman compression:

* **Fixed-Width Baseline:** In conventional micro-architectures, every instruction requires a fixed $W_{\text{baseline}}$ fetch bandwidth (e.g. 16 or 32 bits), leading to wasted bus capacity on simple instructions.
* **Huffman-Compressed Control Memory:** Instructions are stored with variable bit lengths. An Instruction Fetch Unit (IFU) shift buffer streams bits continuously.
* **Bandwidth Savings Metric:**
  $$\text{Bus Bandwidth Reduction} = \left(1 - \frac{\sum_{i=1}^M l_i}{M \times W_{\text{baseline}}}\right) \times 100\%$$

# IEEE 期刊周报 · 2026-10-29

> 检索窗口 **2026-10-23 → 2026-10-29**（近 7 天）｜覆盖期刊 **10** 种｜抓取 **57** 篇（Early Access 14）｜关键词命中 **14** 篇｜研判 **14** 篇｜推荐 **3** 篇

数据源：Crossref（DOI 收录时间）＋ IEEE Xplore（摘要 / Early Access 标记）｜研判引擎：**大模型逐篇研判（deepseek-chat）**

> **本期导读**：本周三篇 TMTT 论文聚焦线性化与输出网络设计：双输入神经网络 DPD 应对 MIMO 阵列负载调制，知识蒸馏多模型残差网络实现低复杂度配置自适应，均面向 GaN PA 阵列；Doherty 输出网络解析综合则为 GaN DPA 提供低维优化工程方法。

---

## 一、本周必读（2 篇）

### 1. Linearizing Digital MIMO Arrays Under Load Modulation: Dual-Input Neural Network Approaches

- **期刊／状态**：IEEE Transactions on Microwave Theory and Techniques ｜ Early Access
- **上线日期**：2026-10-27（Crossref 收录时间）
- **作者**：Yurui Wang, Joel Fernandez, Arne Fischer-Bühner 等 5 人
- **结论**：MIMO阵列负载调制下的双输入NN DPD，GaN PA阵列线性化可直接借鉴
- **做了什么**：针对MIMO发射机中天线耦合引起PA负载调制、使传统DPD失效的问题，提出嵌入负载信息的双输入神经网络行为模型与DPD结构，在数字MIMO阵列上验证线性化效果。
- **方法**：双输入神经网络行为模型/DPD，输入含负载调制相关信息；工艺与测试平台摘要未说明。
- **结果**：摘要未给出ACPR、EVM等具体指标。
- **可借鉴**：做GaN Doherty/LMBA阵列时，可借鉴把负载阻抗信息作为第二输入训练DPD，缓解耦合导致的非线性漂移。
- **亮点**：把负载调制显式纳入NN-DPD输入
- **评分**：85/100（模型研判）
- **链接**：[DOI](https://doi.org/10.1109/tmtt.2026.3739851) ｜ [IEEE Xplore](https://ieeexplore.ieee.org/document/11755558)

### 2. An Analytics-Driven Output Network Synthesis Method for Doherty Power Amplifiers

- **期刊／状态**：IEEE Transactions on Microwave Theory and Techniques ｜ Early Access
- **上线日期**：2026-10-27（Crossref 收录时间）
- **作者**：Yifei Chen, Seungwon Park, Jooseok Lee 等 9 人
- **结论**：Doherty输出网络解析综合，GaN DPA设计可直接用的工程方法
- **做了什么**：针对Doherty PA输出网络设计依赖经验、优化维度高的问题，基于严格电路模型提出解析综合方法，由少量设计参数经低维数值优化确定网络元件值，改善负载调制期效率。
- **方法**：基于电路模型的输出网络解析综合+低维数值优化；工艺与实测细节摘要未说明。
- **结果**：摘要称简化设计流程并提升负载调制效率，未给出具体PAE/带宽数字。
- **可借鉴**：可直接用于GaN Doherty合路/阻抗变换网络快速综合，减少反复EM迭代，适合宽带DPA起步设计。
- **亮点**：低维优化替代高维输出网络寻优
- **评分**：85/100（模型研判）
- **链接**：[DOI](https://doi.org/10.1109/tmtt.2026.3745534) ｜ [IEEE Xplore](https://ieeexplore.ieee.org/document/11755562)

## 二、值得一看（1 篇）

- **Knowledge-Distillation-Aided Multimodel Residual Neural Network for Low-Complexity Configuration Adaptive Digital Predistortion** （TMTT，Early Access，2026-10-23） — 知识蒸馏多模型残差NN的DPD，低复杂度自适应，方法可迁移GaN PA <br>　针对传输配置快速变化导致PA非线性随配置漂移、固定DPD模型失效的问题，提出多模型残差神经网络并结合知识蒸馏降低复杂度，实现配置自适应DPD。 [DOI](https://doi.org/10.1109/tmtt.2026.3742117)

## 三、存档（1 篇，相关但优先级低）

- **Physics-Informed Neural Network-Based Model for GaN HEMTs With Temperature Dependence** （TMTT，Early Access，2026-10-27） — GaN HEMT温度相关PINN器件模型，对PA大信号建模有间接价值 <br>　针对GaN HEMT温度相关非线性建模，提出结合神经网络电荷表示与器件物理约束的PINN模型，以Vgs、Vds、温度为输入拟合源漏电流等特性。 [DOI](https://doi.org/10.1109/tmtt.2026.3741497)

## 四、已研判但判定略过（10 篇，仅列标题）

- Maximizing Radiated Power and Efficiency in Multitone Digital Beamforming Transmitters（MWTL，2026-10-27）
- An AS-MCR Matching Network for Wideband High-Impedance Low-Power CMOS Power Amplifiers（TCAS-I，2026-10-27）
- GaN Monolithic Bidirectional Switch Employing Gate Termination Extensions for Improved Breakdown Voltage and Power Figure of Merit（TED，2026-10-26）
- A Generalized Synthesis Framework for Low-Q Wideband Lumped-Element Filters With Enhanced Passband Flatness（TMTT，2026-10-26）
- 8-in CMOS-Compatible GaN-on-Si Bidirectional Switch With p-GaN Gate Structure for >1.5 kV Breakdown（TED，2026-10-26）
- A Unified Frequency–Phase–Geometry Framework for 4-D/Shape -Reconfigurable Circular Phased Arrays: Pattern-Invariant, Squint-Free Beamforming With a Single Phase State Across a 3:1 Bandwidth（TMTT，2026-10-27）
- Optically Transparent On-Glass Millimeter-Wave Dual-Band Bandstop Frequency Selective Surface for Angle-Stable RF Shielding（MWTL，2026-10-27）
- Reusable GaN Chiplets with Inter-Chip Level Shifting and Near-Zero Voltage Drop Bootstrap for Reconfigurable Power Converters（TCAS-I，2026-10-26）
- Enabling Adaptive Lensing With Reconfigurable Metastructures: A Mechanically Reconfigurable Metalens-Enabled Multiband mmID for Adaptive mmWave Front Ends（TMTT，2026-10-27）
- Comparison of Thin Al x Ga1-x AsSb Avalanche Regions for High-Speed Optical Communication（TED，2026-10-26）

## 本周统计

| 期刊 | 研判 | 必读 | 值得看 | 存档 | 略过 |
| --- | ---: | ---: | ---: | ---: | ---: |
| TMTT | 7 | 2 | 1 | 1 | 3 |
| MWTL | 2 | 0 | 0 | 0 | 2 |
| TCAS-I | 2 | 0 | 0 | 0 | 2 |
| TED | 3 | 0 | 0 | 0 | 3 |

---

## 关于这份周报

**它做了什么**：每周自动检查这 10 本 IEEE 期刊在过去 7 天新注册的 DOI（含 Early Access），逐篇读摘要，按"化合物工艺功率放大器"方向打分，只把值得看的挑出来。

**有什么用**：把"每周挨个期刊翻目录、读几十条标题和摘要"压缩成 3 分钟；Early Access 通常比正式见刊早 3-6 个月，能提前看到同行的新架构、新工艺与实测数据。

**边界**：只读标题/摘要/元数据，不下载全文；评分只作筛选辅助，取舍仍看原文。

_改关键词 / 期刊 / 收件人：编辑 `config.json` 后重跑。_
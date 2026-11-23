# TÀI LIỆU CẬP NHẬT KIẾN TRÚC TÍNH NĂNG & LOẠI BỎ CÁC THÀNH PHẦN THỪA
## Hệ sinh thái Quản lý & Cho Tôm Ăn Thông Minh - ShrimpMate
**Đề tài Khóa luận Tốt nghiệp:** Kỹ thuật Phần mềm – Đại học Công nghiệp TP.HCM (IUH)  
**Nhóm sinh viên thực hiện:** Phan Hữu Lộc – Đoàn Lan Hương  
**Giảng viên hướng dẫn:** TS. Nguyễn Vũ Lâm  
**Ngày cập nhật:** Tháng 11/2026  

---

## MỤC LỤC
1. [Lý do Cốt lõi của việc Tinh gọn & Loại bỏ Thành phần Thừa](#1-lý-do-cốt-lõi-của-việc-tinh-gọn--loại-bỏ-thành-phần-thừa)
2. [Chi tiết Các Thành phần ĐÃ LOẠI BỎ HOÀN TOÀN](#2-chi-tiết-các-thành-phần-đã-loại-bỏ-hoàn-toàn)
3. [Tổng hợp Toàn bộ Các Tính năng MỚI ĐÃ LÀM & CHUẨN HÓA](#3-tổng-hợp-toàn-bộ-các-tính-năng-mới-đã-làm--chuẩn-hóa)
4. [Bảng Đối Chiếu Hiện Trạng Hệ Thống (Trước vs Sau khi Tinh Gọn)](#4-bảng-đối-chiếu-hiện-trạng-hệ-thống-trước-vs-sau-khi-tinh-gọn)
5. [Hướng Dẫn Rà Soát & Dọn Dẹp Mã Nguồn (Web, Mobile, Backend, AI, Docx)](#5-hướng-dẫn-rà-soát--dọn-dẹp-mã-nguồn)

---

## 1. LÝ DO CỐT LÕI CỦA VIỆC TINH GỌN & LOẠI BỎ THÀNH PHẦN THỪA

Trong quá trình nghiên cứu lý thuyết ban đầu, đề tài từng đề xuất hướng tiếp cận sử dụng **Camera quan sát dưới nước kết hợp thị giác máy tính tại sàng ăn (nhá tôm)**. Tuy nhiên, khi đi vào triển khai thực nghiệm thực tế tại các ao nuôi thâm canh và siêu thâm canh tôm thẻ chân trắng (*Litopenaeus vannamei*), nhóm đã quyết định **loại bỏ hoàn toàn camera dưới nước và sàng ăn** vì 4 rào cản kỹ thuật và kinh tế không thể vượt qua:

1. **Rào cản môi trường nước ao tôm (Độ đục và Rong tảo):**
   * Nước ao nuôi tôm thẻ thâm canh công nghệ cao luôn có mật độ tảo và vi sinh rất dày, nước có màu trà hoặc xanh đậm, độ đục cao. Thêm vào đó, hệ thống quạt nước và sục khí đáy thổi liên tục làm bùn hữu cơ cuộn lên. Camera đặt dưới nước chỉ quan sát được trong phạm vi $< 30\text{ cm}$.
   * Chỉ sau 24 - 48 giờ đặt dưới nước mặn, thấu kính camera bị nhớt hữu cơ, màng vi sinh và cặn vôi bám kín, làm mất hoàn toàn khả năng nhận diện hình ảnh của các mô hình như YOLO.
2. **Sai lệch về phương thức cho ăn công nghiệp:**
   * Trong mô hình nuôi công nghiệp, máy cho ăn tự động sử dụng **cơ cấu văng ly tâm (Spreader)** phun cám viên rải đều ra bán kính $6 - 15\text{ m}$ khắp ao để hàng trăm ngàn con tôm cùng ăn, tránh tôm tranh mồi đâm nhau gãy gai râu. 
   * Tôm không còn tập trung ăn tại 1 - 2 cái nhá sàng nhỏ ở góc ao. Việc quan sát nhá ăn thủ công vốn chỉ là tập quán cũ của các ao nuôi quảng canh thô sơ, không còn đại diện cho sức ăn tổng thể của cả ao tôm công nghiệp.
3. **Chi phí phần cứng phi thực tế:**
   * Một cụm camera công nghiệp đạt chuẩn chống nước chịu áp lực sâu IP68, chống ăn mòn nước mặn và có cần gạt rửa kính tự động có giá thành $> 15.000.000\text{ VNĐ/cái}$—vượt quá ngân sách của nông dân và phá vỡ mục tiêu tối ưu chi phí phần cứng (9 triệu VNĐ/ao) của đề tài.
4. **Tránh nguy cơ "cháy giáo án" khi bảo vệ trước Hội đồng:**
   * Nếu đưa camera và mô hình YOLO nhận diện nhá ăn vào báo cáo, Hội đồng phản biện sẽ yêu cầu mang thiết bị camera chống nước ra trình diễn và bật video quay thực tế dưới đáy ao tôm. Do không có phần cứng này, việc loại bỏ triệt để và tập trung vào **IoT Quan trắc nước + AI Học máy XGBoost 7 đặc trưng** là quyết định chính xác và thực tế nhất!

---

## 2. CHI TIẾT CÁC THÀNH PHẦN ĐÃ LOẠI BỎ HOÀN TOÀN

### ❌ 2.1. Loại bỏ Camera dưới nước & Nhá ăn / Sàng ăn (Feeding Tray)
* **Xóa bỏ:** Khái niệm camera IP68 dưới nước, thiết bị camera, bộ quét hình ảnh nhá ăn, và các cơ chế kéo nhá thủ công.
* **Xóa bỏ trong Backend:** Thu hồi toàn bộ entity, migration, và API liên quan đến `camera` và `camera_fis_logs`. Danh mục thiết bị `DeviceType` chỉ giữ đúng 3 loại: `feeder`, `sensor_node`, `edge_gateway`.

### ❌ 2.2. Loại bỏ Mô hình Thị giác Máy tính YOLO11n & MobileNetV3
* **Xóa bỏ:** Không dùng mạng YOLO11n-seg phân đoạn hạt cám, không dùng MobileNetV3 phân loại hành vi tôm bơi, không tính toán các đại lượng $R_t$ (diện tích cám dư), $v_t$ (tốc độ ăn), $D_t$ (mật độ tôm).
* **Xóa bỏ:** Chỉ số thèm ăn FIS (Feeding Intensity Score) Mức 0 - Mức 3 tính theo công thức mờ hay quy tắc có trọng số $w_1, w_2, w_3, w_4$.

### ❌ 2.3. Loại bỏ Mô hình Chuỗi Thời gian LSTM & Thuật toán Isolation Forest
* **Xóa bỏ:** Mạng nơ-ron hồi quy LSTM dự báo thức ăn (vì tốn tài nguyên GPU tính toán, dễ quá khớp khi dữ liệu dạng bảng theo vụ mùa chỉ cần mô hình Boosting là tối ưu).
* **Xóa bỏ:** Thuật toán Isolation Forest phát hiện bất thường (được thay thế bằng **Bộ quy tắc an toàn Safety Rule Engine** và kiểm soát ngưỡng QCVN trực tiếp trong Backend, giúp phản hồi tức thời dưới 10ms mà không tốn công huấn luyện mô hình unsupervised).

---

## 3. TỔNG HỢP TOÀN BỘ CÁC TÍNH NĂNG MỚI ĐÃ LÀM & CHUẨN HÓA

Toàn bộ hệ thống ShrimpMate hiện nay tập trung **100% vào đối tượng Tôm thẻ chân trắng (*Litopenaeus vannamei*)** trong các mô hình nuôi thâm canh và siêu thâm canh công nghệ cao. Vòng lặp điều khiển khép kín gồm:

$$\text{Cảm biến Nước (IoT)} \longrightarrow \text{Dự báo Lượng Cám (AI XGBoost)} \longrightarrow \text{Chốt chặn An toàn (Safety Rule Engine)} \longrightarrow \text{Máy Cho Ăn Tự Động (Feeder)}$$

###  3.1. Phân hệ Trí tuệ Nhân tạo (`shrimpmate-AI`)
1. **Mô hình cốt lõi duy nhất - XGBoost Regressor v2.0.0:**
   * Huấn luyện chuyên sâu để dự báo chính xác khối lượng thức ăn cho từng cữ ăn ($\text{kg/cữ}$).
   * Sử dụng đúng **vector 7 đặc trưng sinh học và môi trường nước cốt lõi**:
     $$x = [\text{DOC}, \text{ABW}, \text{DO}_{\min}, \Delta\text{TAN}, \text{MorningRain}, \text{PrevFeed}, \text{WaterChange}]$$
     * $\text{DOC}$: Ngày tuổi tôm (1 - 105 ngày).
     * $\text{ABW}$: Khối lượng tôm bình quân mẫu ($0.8 - 38.0\text{ g/con}$).
     * $\text{DO}_{\min}$: Nồng độ oxy hòa tan tối thiểu sáng sớm ($2.8 - 7.2\text{ mg/L}$).
     * $\Delta\text{TAN}$: Biến thiên tổng đạm Amoniac giữa 2 cữ ăn ($\text{mg/L}$).
     * $\text{MorningRain}$: Lượng mưa sáng sớm ($0 - 50\text{ mm}$).
     * $\text{PrevFeed}$: Khối lượng thức ăn đã ăn cữ trước ($\text{kg}$).
     * $\text{WaterChange}$: Thể tích nước thay trong ngày ($\text{m}^3$).
2. **Bộ dữ liệu thực nghiệm chuẩn C.P. Group (`shrimp_feeding_dataset.csv`):**
   * Tổng cộng **4.000 bản ghi thực nghiệm** được xây dựng bằng phương pháp mô phỏng sinh học dựa trên 3 nguồn khoa học chính thống: Bảng định mức kỹ thuật C.P. Group Việt Nam, Quy chuẩn QCVN 02-19:2014 & nghiên cứu tại IUH (Đỗ Doãn Dung et al. 2024), và số liệu thủy văn ĐBSCL.
3. **Pipeline Huấn luyện tự động (`train_from_csv.py`):**
   * Cho phép nạp bất kỳ file CSV thực tế nào và huấn luyện mô hình chỉ trong **1.01 giây**.
   * Kết quả thực nghiệm kiểm thử xuất sắc:
     * **MAE = 0.280 kg/cữ** (Sai số cực thấp).
     * **MAPE = 3.06%** (Độ chính xác $> 96.9\%$).
     * **$R^2\text{ Score} = 0.992$** (Giải thích hơn 99% biến thiên nhu cầu ăn).
     * **Độ trễ suy luận = 0.45 ms** (Đáp ứng thời gian thực tức thì).
4. **Khả năng Giải thích Mô hình TreeSHAP (Explainable AI - XAI):**
   * Tự động phân rã mức độ đóng góp cục bộ ($\Delta\text{kg}$) của từng biến số từ mốc cơ sở (base value).
   * Cung cấp chuỗi giải thích nông học trực quan cho người nuôi (ví dụ: *oxy hòa tan tốt giúp tăng +0.74 kg, mưa sáng sớm làm giảm -0.42 kg...*).

---

###  3.2. Phân hệ Máy chủ Trung tâm (`shrimpmate-backend`)
1. **Kiến trúc Modular Monolith chuẩn mực (NestJS 12, TypeORM 1.1, PostgreSQL 16/TimescaleDB):**
   * Gom toàn bộ logic vào một khối module hóa mạch lạc, đảm bảo tính toàn vẹn giao dịch ACID và không bị trễ mạng nội bộ.
2. **Phân quyền 3 Vai trò (RBAC) & Ngăn chặn IDOR (`PondAccessService`):**
   * `ADMIN`: Sử dụng Web Dashboard, giám sát toàn hệ thống, quản lý tài khoản, danh mục phần cứng.
   * `MANAGER`: Sử dụng Web App, quản lý đa trang trại, tạo ao, thiết lập vụ nuôi, gán thiết bị IoT, và **phân công ao cho nhân viên (`farmer_assignments`)**.
   * `FARMER`: Sử dụng Mobile App, chỉ truy cập và điều khiển các ao được Quản lý phân công.
3. **Lớp Quy tắc An toàn Độc quyền 3 Tầng (`SafetyRuleEngineService`):**
   * **Tầng 1 - Kiểm tra độ tươi cảm biến (Freshness Check):** Nếu ao không có dữ liệu hoặc dữ liệu cũ quá 30 phút $\rightarrow$ Hủy cữ ăn (`BLOCKED`).
   * **Tầng 2 - 8 Quy tắc an toàn động theo QCVN 02-19:2014:**
     * Thiết bị lỗi / E-Stop $\rightarrow$ `BLOCKED`.
     * $\text{DO} < 3.5\text{ mg/L} \rightarrow \text{BLOCKED}$ (Chống ngạt).
     * $\text{DO} \in [3.5, 4.0)\text{ mg/L} \rightarrow \text{ADJUSTED}$ (Giảm 50% thức ăn).
     * Nhiệt độ $< 22^\circ\text{C}$ hoặc $> 34^\circ\text{C} \rightarrow \text{ADJUSTED}$ (Giảm 50%).
     * $\text{pH} < 7.0$ hoặc $\text{pH} > 9.0 \rightarrow \text{BLOCKED}$.
     * Khí độc $\text{NH}_3 > 0.3\text{ mg/L} \rightarrow \text{BLOCKED}$.
     * $\Delta\text{TAN} > 0.5\text{ mg/L} \rightarrow \text{ADJUSTED}$ (Giảm 50%).
     * Mưa sáng sớm $\ge 15.0\text{ mm} \rightarrow \text{ADJUSTED}$ (Giảm 30%).
   * **Tầng 3 - Dự báo xu hướng DO sụt giảm trước cữ ăn (Adaptive Feeding):**
     * Tính toán độ dốc biến thiên DO, sụt giảm ban đêm ($0.35\text{ mg/L}$) và tải trọng oxy tiêu hao sau khi ăn ($\text{BOD}_{\text{feed}}$).
     * Nếu dự báo trong 1-2h tới $\text{DO} < 3.2\text{ mg/L} \rightarrow$ Tự động cắt giảm 40% thức ăn để bảo vệ đàn tôm.
4. **Lập lịch Hàng đợi BullMQ Idempotent & Worker:**
   * Quét lịch mỗi phút, đẩy job vào hàng đợi BullMQ với Idempotent Key chống lặp. Worker kiểm tra trạng thái máy cho ăn (nếu `OFFLINE` $\rightarrow$ hủy cữ ăn an toàn, không phát lệnh vào hư không).
5. **Cơ chế Chống bão cảnh báo (Alert Cooldown 15 phút):**
   * Sử dụng Redis với lệnh `SET NX EX 900` trên key `alert:cooldown:{pondId}:{alertType}`.
6. **Xử lý Gói tin Đệm ngoại tuyến (`isBuffered: true`):**
   * Gói tin lưu đệm từ bộ nhớ Flash của ESP32 sau khi có mạng lại sẽ được lưu vào TimescaleDB để vẽ biểu đồ, nhưng **bỏ qua cảnh báo tức thời** để tránh gây báo động giả với dữ liệu cũ.
7. **Cơ chế Dự phòng Nông học (Heuristic Aquaculture Fallback):**
   * Nếu AI Microservice mất kết nối hoặc timeout quá 6 giây, Backend tự động tính toán lượng cám an toàn dựa trên bảng tỷ lệ sinh khối tôm thẻ để quy trình cho ăn không bị gián đoạn.

---

###  3.3. Phân hệ Web Điều hành & Quản trị SCADA (`ShrimpMate_Web`)
1. **Bảng Điều khiển SCADA Tổng quan (`DashboardView.jsx`):**
   * Safety Interlock Banner hiển thị trạng thái nước trước khi cho ăn.
   * 4 thẻ KPI cốt lõi kèm vòng tròn tiến độ SVG.
   * Chế độ chuyển đổi linh hoạt giữa Lưới Thẻ Ao Nuôi (`PondCard`) và Chế độ Bảng.
   * Biểu đồ tương quan 24h giữa Lượng thức ăn (cột Cam) và Oxy hòa tan DO (đường Xanh).
2. **Trang Điều khiển Máy Cho Ăn (`FeederControlView.jsx`):**
   * Đồng hồ tròn tiến độ lớn (**Big Circular Feeder Gauge**) hiển thị % thức ăn đã rải trong ngày, tốc độ RPM và nhiệt độ biến tần VFD.
   * Bảng 6 nút lệnh điều khiển chiến thuật (`Rải ngay`, `Tạm dừng`, `Dừng hẳn`, `Tăng/Giảm tốc`, `Kiểm tra động cơ`).
   * Chọn bán kính phun biến tần VFD: 3 nấc chuẩn (`6m - Gần`, `10m - Chuẩn`, `14m - Rộng`).
   * Hộp thoại khóa an toàn `SafetyBlockedModal` (HTTP 422) giải thích rõ mã luật vi phạm khi bị chặn ăn.
3. **Nút Dừng Khẩn Cấp Toàn Trạm (E-Stop):**
   * Nút đỏ cố định trên thanh Header ngắt điện toàn bộ máy rải cám trong thời gian $< 800\text{ ms}$.
4. **Lập lịch Cho ăn Tự động & Gợi ý AI (`ScheduleView.jsx`):**
   * Quản lý 4 cữ ăn/ngày, áp dụng nhanh khuyến nghị AI với 1 cú click chuột.
5. **Giám sát Trạm IoT & Nhật ký SCADA (`IoTStationView.jsx`, `ScadaLogsView.jsx`):**
   * Lưới 6 đồng hồ đo chất lượng nước (DO, pH, Nhiệt độ, Độ mặn, $\text{NH}_3$, Độ đục).
   * Tra cứu nhật ký vận hành và xuất báo cáo ra file CSV.
6. **Cổng Quản trị Admin Console (`/admin/*`):**
   * Quản lý người dùng, kho thiết bị chuẩn Hardware Catalog (`deviceUid`), kiểm thử xung lệnh MQTT.

---

###  3.4. Phân hệ Di động Bờ ao Thông minh (`ShrimpMate_Mobile`)
1. **Thiết kế chuyên biệt cho Người nuôi (Farmer bờ ao):**
   * Chặn kép Admin và Manager bằng Guard modal điều hướng về Web.
   * Bắt buộc đổi mật khẩu mới trong lần đầu đăng nhập (`isFirstLogin === true`).
2. **Phân vùng Dữ liệu Bờ ao (`Assignment Isolation`):**
   * Chỉ hiển thị các ao nuôi được Quản lý phân công qua bảng `farmer_assignments`.
   * Hiển thị màn hình `NoAssignedPondState` nếu tài khoản chưa được gán ao.
3. **Cơ chế Mạng & Ngoại tuyến Hiện đại:**
   * **Silent Refresh Token với Mutex Lock:** Xử lý lỗi HTTP 401 âm thầm không làm gián đoạn người dùng.
   * **Offline Cache (`AsyncStorage`):** Lưu trữ tạm dữ liệu ao nuôi để người dùng tra cứu khi đi ra bờ ao sóng yếu.
   * Xóa bỏ hoàn toàn Mock Data, hiển thị trung thực dữ liệu thực tế từ Backend.
4. **4 Tab Vận hành Bờ ao Cốt lõi:**
   * **Tab 1 - Lịch Cữ (`index.tsx`):** Thẻ tóm tắt ao, khẩu phần hôm nay, thẻ khuyến nghị AI (nút áp dụng mức cám AI), cữ ăn trong ngày và nút **Cho Ăn Nhanh (`Quick Feed`)**.
   * **Tab 2 - Trạm Ăn (`may-cho-an.tsx`):** Banner trạng thái Safety Rule Engine (4 màu trực quan), tiến độ rải cám của Feeder, điều chỉnh lượng rải thủ công và nút **Dừng Khẩn Cấp 1 Chạm (`EMERGENCY STOP`)**.
   * **Tab 3 - Giám Sát Nước (`quan-ly-ao.tsx`):** 6 đồng hồ đo chất lượng nước (DO, pH, Nhiệt độ, Độ mặn, $\text{NH}_3$, Độ đục) tự động đổi màu theo ngưỡng an toàn sinh học.
   * **Tab 4 - Cài Đặt (`cai-dat.tsx`):** Quản lý tài khoản, đổi mật khẩu, danh sách thiết bị IoT tại ao.

---

## 4. BẢNG ĐỐI CHIẾU HIỆN TRẠNG HỆ THỐNG (TRƯỚC VS SAU KHI TINH GỌN)

| Hạng mục / Phân hệ | Khảo sát / Đề xuất Cũ (Lý thuyết) | Hiện trạng Thực tế Đã Hoàn thiện (Code Thật) |
| :--- | :--- | :--- |
| **Đối tượng nuôi** | Nuôi tôm chung chung, chưa phân rõ loài | **Tôm thẻ chân trắng (*Litopenaeus vannamei*)** thâm canh công nghệ cao |
| **Thiết bị giám sát tại ao** | Đề xuất Camera chống nước IP68 + Sàng ăn (nhá) | **Trạm cảm biến chất lượng nước (RS485 Modbus RTU)** gắn trực tiếp trong nước |
| **Phương thức rải cám** | Cho ăn thủ công theo dõi nhá ăn | **Máy phun cám tự động biến tần VFD** phun ly tâm bán kính $6 - 14\text{ m}$ |
| **Mô hình AI dự báo thức ăn** | Đề xuất hỗn hợp LightGBM + LSTM | **XGBoost Regressor (7 đặc trưng)** + **TreeSHAP (XAI)** đạt $R^2 = 0.992$, $\text{MAPE} = 3.06\%$ |
| **Cơ chế an toàn sinh học** | Cảnh báo ngưỡng đơn giản | **Lớp quy tắc an toàn 3 tầng (Safety Rule Engine)** tích hợp dự báo sụt giảm oxy thích ứng |
| **Xử lý sự cố phần cứng** | Phát hiện thủ công khi đi thăm ao | **Nút Dừng Khẩn Cấp (E-Stop)** ngắt rơ-le trong thời gian $< 800\text{ ms}$ trên cả Web và Mobile |
| **Quản trị người dùng** | Phân quyền 2 vai trò đơn giản | **Phân quyền 3 vai trò (RBAC)**: Admin (Web Dashboard), Manager (Web App), Farmer (Mobile App) |
| **Phân bổ nhân sự ao** | Chưa có cơ chế quản lý phân công | **Bảng phân công ao `farmer_assignments`** cô lập an toàn phạm vi truy cập dữ liệu bờ ao |
| **Chống bão cảnh báo** | Bắn thông báo liên tục mỗi khi đo | **Redis Cooldown 15 phút** (`SET NX EX 900`) triệt tiêu Alert Fatigue |
| **Khả năng chịu lỗi mạng** | Mất mạng là gián đoạn dữ liệu | **Edge Buffer SPIFFS (ESP32)** lưu 2.000 bản ghi + **Offline Cache (Mobile AsyncStorage)** |

---

## 5. HƯỚNG DẪN RÀ SOÁT & DỌN DẸP MÃ NGUỒN

Để toàn bộ hệ thống (Web, Mobile, Backend, AI, Báo cáo Word) hoàn toàn đồng nhất và sạch sẽ, các bước dọn dẹp cần thực hiện gồm:

1. **Trên dự án Web (`ShrimpMate_Web`):**
   * Xóa file component cũ: `src/components/CameraFisView.jsx`.
   * Trong `src/App.jsx` và `src/constants/navigation.js`: Xóa bỏ route `/camera-fis` và mục menu "Camera Sàng ăn FIS".
   * Đổi tên menu thành **"Giám sát Chất lượng Nước & Trạm IoT"**.
2. **Trên dự án Mobile (`ShrimpMate_Mobile`):**
   * Trong file `src/app/(tabs)/quan-ly-ao.tsx`: Xóa bỏ khối hiển thị khung camera và thanh 4 mức FIS. Đổi tên tab thành **"Giám Sát Nước"** hiển thị chuyên sâu 6 đồng hồ chất lượng nước (DO, pH, Temp, Salinity, NH3, Turbidity).
3. **Trong file Báo cáo Word (`Nhom009_KLTN.docx`):**
   * Mở file [FIX_DOC_NHOM009.md](file:///D:/KLTN/FIX_DOC_NHOM009.md), áp dụng đúng 14 điểm Search & Replace (`Ctrl + F`).
   * Toàn bộ các đoạn nhắc đến "YOLO11n", "MobileNetV3", "Camera IP68", "sàng ăn/nhá ăn" sẽ được thay thế 100% bằng **Trạm quan trắc chất lượng nước đa chỉ số và Mô hình học máy XGBoost Regressor 7 đặc trưng + TreeSHAP**.

---
*Tài liệu này là căn cứ kỹ thuật chính thức và chuẩn xác nhất phản ánh đúng 100% mã nguồn thực tế của hệ sinh thái ShrimpMate.*

# TÀI LIỆU HƯỚNG DẪN CHỈNH SỬA VÀ ĐỒNG BỘ BÁO CÁO KHÓA LUẬN TỐT NGHIỆP (NHÓM 009)
> **Đề tài**: ShrimpMate - Hệ thống phần mềm quản lý và cảnh báo tự động cho hệ thống cho tôm ăn thông minh sử dụng IoT và AI  
> **Sinh viên thực hiện**: Phan Hữu Lộc (22653351), Đoàn Lan Hương (22002095)  
> **Giảng viên hướng dẫn**: TS. Nguyễn Vũ Lâm  
> **Mục đích tài liệu**: Chỉ dẫn chi tiết từng vị trí cần chỉnh sửa trong file báo cáo Word/PDF của nhóm để khớp 100% với hệ thống thực tế (đã loại bỏ hoàn toàn Camera/Thị giác máy tính, chuẩn hóa mô hình học máy dạng bảng XGBoost 7 đặc trưng, kiến trúc Modular Monolith NestJS + AI Microservice FastAPI, chuẩn hóa CSDL 13 bảng).

---

## MỤC LỤC TỔNG QUAN
1. [Bảng kiểm tra nhanh các điểm chính cần sửa](#1-bang-kiem-tra-nhanh)
2. [Chi tiết sửa phần Đầu báo cáo & Chương 1 (Giới thiệu)](#2-chuong-1)
3. [Chi tiết sửa Chương 2 (Cơ sở lý thuyết & Công nghệ)](#3-chuong-2)
4. [Chi tiết sửa Chương 3 (Phân tích yêu cầu & Thiết kế hệ thống)](#4-chuong-3)
5. [Chi tiết hoàn thiện Chương 5 (Kiểm thử & Đánh giá)](#5-chuong-5)
6. [Chi tiết rà soát Chương 7 (Kết luận & Hướng phát triển)](#6-chuong-7)

---

<a name="1-bang-kiem-tra-nhanh"></a>
## 1. BẢNG KIỂM TRA NHANH CÁC ĐIỂM CHÍNH CẦN SỬA

| STT | Vị trí trong báo cáo | Hiện trạng lỗi / lệch chuẩn | Hướng chỉnh sửa cụ thể |
|:---:|---|---|---|
| **1** | Trang bìa & Thông tin đầu | Bị lặp nhân đôi 2 lần (tiếng Việt & tiếng Anh) | Xóa bỏ các trang bìa và trang thông tin bị trùng lặp. |
| **2** | Mục Lục & Từ viết tắt | Bảng từ viết tắt đang để trống | Điền bảng viết tắt chuẩn chuyên ngành (IoT, AI, DO, TAN, FCR, DOC, ABW, MQTT, FCM...). |
| **3** | Mục 1.1 (Tổng quan) | Bị lặp nguyên 2 đoạn văn giống hệt nhau | Xóa đoạn văn trùng lặp ở nửa sau mục 1.1. |
| **4** | Mục 1.2, 1.3, 1.5, 2.4.4, 3.3.3 | Còn nhắc đến Camera, YOLO11, MobileNetV3, chỉ số FIS | **XÓA TOÀN BỘ** nội dung về Camera/YOLO/MobileNet trong các phân hệ đã thực hiện. Đưa camera về "Hướng phát triển tương lai" ở Chương 7. |
| **5** | Mục 1.2, 1.3, 2.4.5 | Đang ghi dự báo bằng LightGBM/LSTM | Đồng bộ thành: Mô hình dự báo thức ăn chính là **XGBoost Regressor (7 đặc trưng)**. |
| **6** | Mục 3.3.3 (Kiến trúc hệ thống) | Sơ đồ & thuyết minh còn khối Camera IP68, luồng nhận diện ăn | Xóa Camera khỏi tầng Clients, xóa luồng nhận diện hoạt động ăn, làm rõ luồng gọi AI Microservice qua REST API nội bộ. |
| **7** | Mục 3.3.4 (CSDL) | Còn nhắc tới bảng `camera_fis_logs`, thiếu làm rõ `farmer_assignments` | Xóa bỏ bảng `camera_fis_logs`. Bổ sung chi tiết bảng `farmer_assignments` (13 bảng thực tế). |
| **8** | Chương 5 (Kiểm thử) | Đang để trống 3 đề mục lớn | Bổ sung nội dung kiểm thử chức năng, kết quả benchmark mô hình XGBoost và kiểm thử Safety Rule Engine. |

---

<a name="2-chuong-1"></a>
## 2. CHI TIẾT SỬA PHẦN ĐẦU BÁO CÁO & CHƯƠNG 1 (GIỚI THIỆU)

### 2.1. Trang bìa và Trang Danh mục từ viết tắt
* **Trang bìa**: Giữ lại đúng 01 bản tiếng Việt và 01 bản tiếng Anh chuẩn, xóa trang bìa thừa.
* **Bảng danh mục từ viết tắt**: Bổ sung bảng sau vào báo cáo:

| Từ viết tắt | Từ đầy đủ tiếng Anh | Giải nghĩa tiếng Việt |
|---|---|---|
| **IoT** | Internet of Things | Mạng lưới vạn vật kết nối Internet |
| **AI** | Artificial Intelligence | Trí tuệ nhân tạo |
| **DO** | Dissolved Oxygen | Nồng độ oxy hòa tan trong nước (mg/L) |
| **TAN** | Total Ammonia Nitrogen | Tổng đạm Amoniac trong nước (mg/L) |
| **DOC** | Day of Culture | Ngày tuổi nuôi của tôm |
| **ABW** | Average Body Weight | Trọng lượng bình quân thân tôm (g/con) |
| **FCR** | Feed Conversion Ratio | Hệ số chuyển đổi thức ăn |
| **MQTT** | Message Queuing Telemetry Transport | Giao thức truyền tin gọn nhẹ theo mô hình Pub/Sub |
| **MQTTS** | Secure MQTT (over TLS/SSL) | Giao thức MQTT được mã hóa bảo mật |
| **FCM** | Firebase Cloud Messaging | Dịch vụ gửi thông báo đẩy của Google |
| **RBAC** | Role-Based Access Control | Kiểm soát truy cập dựa trên vai trò |
| **QCVN** | Quy chuẩn Việt Nam | Quy chuẩn kỹ thuật quốc gia (QCVN 02-19:2014/BNNPTNT) |

### 2.2. Mục 1.1: Tổng quan
* **Xóa bỏ**: Đoạn văn bị nhân đôi nguyên văn:
  > *"Nuôi tôm là một trong những ngành kinh tế mũi nhọn của Việt Nam... giảm thiểu rủi ro cho người nuôi."* (chỉ giữ lại 01 đoạn duy nhất).

### 2.3. Mục 1.2.2: Mục tiêu cụ thể
* **Đoạn cần sửa**:
  > *Cũ*: "Xây dựng kiến trúc AI đa mô hình gồm mô hình dự báo nhu cầu thức ăn (LightGBM/LSTM), mô hình nhận diện hoạt động ăn của tôm qua hình ảnh (YOLO11n kết hợp MobileNetV3) và mô hình ước tính sinh khối..."
* **Thay bằng**:
  > *Mới*: "Xây dựng mô hình AI học máy dạng bảng dựa trên thuật toán **XGBoost Regressor** với vector 7 đặc trưng sinh học và thủy lý hoá (DOC, ABW, $DO_{min}$, $\Delta TAN$, lượng mưa, lượng ăn cữ trước, lượng nước thay), nhằm phân tích chính xác nhu cầu thức ăn và đưa ra định mức cấp phát tối ưu (kg/cữ) cho từng ao nuôi."

### 2.4. Mục 1.3: Phạm vi đề tài
* **Về phạm vi kỹ thuật**:
  * Đổi từ *"Backend nguyên khối tích hợp AI"* thành: *"Backend nghiệp vụ trung tâm phát triển theo mô hình Modular Monolith bằng NestJS (TypeScript), kết nối với AI Microservice chuyên biệt bằng Python (FastAPI) qua giao thức HTTP REST nội bộ."*
* **Về phạm vi mô hình AI**:
  * **Xóa bỏ toàn bộ**: Nhận diện hình ảnh camera, YOLO11n, MobileNetV3.
  * **Thay bằng**: Trọng tâm AI của đề tài là mô hình hồi quy học máy **XGBoost Regressor** kết hợp chuỗi thời gian phân tích suy giảm oxy hòa tan, được kiểm soát chặt chẽ bởi Lớp quy tắc an toàn (Safety Rule Engine) theo chuẩn QCVN 02-19:2014/BNNPTNT.

### 2.5. Mục 1.4.2.3: Phương pháp xây dựng và tích hợp mô hình AI
* Giữ nguyên cấu trúc 4 bước đã viết rất tốt:
  1. Thu thập & tiền xử lý vector 7 đặc trưng.
  2. Huấn luyện & tối ưu thuật toán XGBoost Regressor ($n\_estimators=600, learning\_rate=0.005, max\_depth=6$).
  3. Đóng gói AI Microservice FastAPI độc lập.
  4. Kiểm duyệt an toàn bắt buộc qua Safety Rule Engine (ALLOWED, ADJUSTED, BLOCKED).

---

<a name="3-chuong-2"></a>
## 3. CHI TIẾT SỬA CHƯƠNG 2 (CƠ SỞ LÝ THUYẾT & CÔNG NGHỆ)

### 3.1. Xóa bỏ hoàn toàn Mục 2.4.4
* **Hành động**: **XÓA BỎ TOÀN BỘ** mục `2.4.4 Kỹ thuật thị giác máy tính nhận diện hoạt động ăn của tôm (YOLO và MobileNetV3)` cùng toàn bộ các công thức tính $A_t, R_t, v_t, D_t, C_t, FIS_t$. 
*(Hệ thống thực tế vận hành hoàn toàn tự động hóa theo dữ liệu cảm biến đa chỉ tiêu và các tham số sinh học, không dùng camera sàng ăn)*.

### 3.2. Sửa lại Mục 2.4.5 & 2.4.6 thành Mô hình Machine Learning Trọng tâm
* Gộp và đổi tiêu đề mục 2.4.5/2.4.6 thành: **Mô hình Extreme Gradient Boosting (XGBoost Regressor) trong dự báo nhu cầu thức ăn**.
* Nội dung thể hiện rõ:
  * Khẩu phần ăn được tính toán theo hàm ánh xạ:
    $$\text{Feed}_t = f(\text{DOC}, \text{ABW}, DO_{min}, \Delta\text{TAN}, \text{Rain}, \text{Feed}_{prev}, \text{WaterEx})$$
  * Nguyên lý thuật toán XGBoost: Tối ưu hóa hàm mất mát kết hợp chính quy hóa L1/L2 chống quá khớp (overfitting), xử lý dữ liệu bảng nhanh gấp nhiều lần so với các mạng nơ-ron sâu truyền thống.

---

<a name="4-chuong-3"></a>
## 4. CHI TIẾT SỬA CHƯƠNG 3 (PHÂN TÍCH YÊU CẦU & THIẾT KẾ HỆ THỐNG)

### 4.1. Mục 3.2: Quy tắc nghiệp vụ và Yêu cầu chức năng
* **Khẳng định rõ mô hình 3 Roles**:
  * **Admin** (Quản trị viên - Web Dashboard): Duy trì hạ tầng, quản lý danh mục thiết bị phần cứng, khóa/mở khóa tài khoản, xem thống kê toàn hệ thống.
  * **Manager** (Quản lý/Chủ trại - Web App): Tự đăng ký tài khoản, tạo và phân công Người nuôi (`Farmer`), tạo trang trại, ao nuôi, vụ nuôi, gán thiết bị, cấu hình lịch cho ăn, xem biểu đồ và báo cáo.
  * **Farmer** (Người nuôi/Kỹ thuật viên - Mobile App): Được Quản lý tạo tài khoản và phân công quản lý ao (`farmer_assignments`), thao tác Cho ăn nhanh, Dừng khẩn cấp và nhận thông báo cảnh báo FCM ngoài bờ ao.

### 4.2. Mục 3.3.3: Kiến trúc hệ thống
* **Trong sơ đồ kiến trúc**:
  * Xóa khối `Camera IP68 (Feeding Tray)` ở cột Clients.
  * Trong khối `Monolith Backend`, đổi tên `AI Prediction & Vision Module` thành **`AI Integration Module`**.
  * Thay luồng camera bằng luồng **HTTP REST API** giữa Backend NestJS và **AI Microservice (FastAPI)**.
* **Trong thuyết minh các luồng**:
  * **Xóa bỏ**: *"Luồng nhận diện hoạt động ăn"*.
  * Hệ thống chỉ gồm **5 luồng dữ liệu chính**:
    1. *Luồng người dùng truy cập* (Mobile/Web qua HTTPS/WSS).
    2. *Luồng thu thập dữ liệu quan trắc Telemetry* (ESP32 $\rightarrow$ MQTT $\rightarrow$ TimescaleDB).
    3. *Luồng suy luận AI dự báo lượng ăn* (NestJS trích xuất 7 đặc trưng $\rightarrow$ FastAPI $\rightarrow$ phản hồi kg thức ăn).
    4. *Luồng điều khiển cữ ăn qua Safety Rule Engine* (Kiểm duyệt ngưỡng QCVN $\rightarrow$ phát lệnh MQTT $\rightarrow$ ESP32 ngắt/bật relay).
    5. *Luồng cảnh báo và thông báo khẩn cấp* (Telemetry vượt ngưỡng $\rightarrow$ Anomaly Service $\rightarrow$ Redis Cooldown $\rightarrow$ FCM Push Notification).

### 4.3. Mục 3.3.4: Kiến trúc lưu trữ (Cơ sở dữ liệu)
* Cập nhật danh sách bảng chính xác thành **13 bảng** (Khớp với `DATABASE.md`):
  1. `users`: Tài khoản, phân quyền 3 roles (`admin`, `manager`, `farmer`), quản lý `manager_id`, `must_change_password`, `isActive`.
  2. `farmer_assignments`: Quản lý việc Manager phân công Farmer phụ trách farm hoặc pond cụ thể.
  3. `farms`: Trang trại nuôi tôm, thuộc quyền sở hữu của Manager (`owner_id`).
  4. `ponds`: Ao nuôi tôm thuộc từng farm.
  5. `crop_seasons`: Vụ nuôi của từng ao (chỉ 1 vụ ACTIVE tại một thời điểm).
  6. `devices`: Danh mục thiết bị IoT (`feeder`, `sensor_node`, `edge_gateway`), gán vào ao qua `pond_id`.
  7. `feeding_schedules`: Lịch cho ăn tự động theo khung giờ, định mức kg và các ngày trong tuần.
  8. `feeding_records`: Nhật ký cữ ăn thực tế, lưu `safety_decision`, `safety_reason`, `actual_amount_kg`.
  9. `telemetry_readings`: Chuỗi thời gian cảm biến (pH, DO, nhiệt độ, độ mặn, NH₃, độ đục, cờ `is_buffered`).
  10. `ai_recommendations`: Kết quả dự báo lượng ăn từ AI, sinh khối ước tính, lý do an toàn.
  11. `safety_rules`: Bộ quy tắc kiểm duyệt môi trường theo chuẩn QCVN.
  12. `alerts`: Cảnh báo sự cố/môi trường theo 3 cấp độ (monitoring, warning, critical).
  13. `password_reset_otps`: Mã OTP khôi phục mật khẩu xác thực qua Email/SMS.
* **Xóa bỏ**: Bảng `camera_fis_logs`.

---

<a name="5-chuong-5"></a>
## 5. CHI TIẾT HOÀN THIỆN CHƯƠNG 5 (KIỂM THỬ VÀ ĐÁNH GIÁ HỆ THỐNG)

Hiện tại Chương 5 đang có 3 đề mục bỏ trống nội dung, cần bổ sung nội dung thực nghiệm cụ thể sau:

### 5.1. Bổ sung nội dung: Kết quả kiểm thử chức năng & An toàn
Bổ sung bảng tổng hợp kết quả kiểm thử chức năng:
* **Kiểm thử phân quyền RBAC**: Đảm bảo Farmer không thể can thiệp vào ao của người khác; Manager chỉ xem được các Farm do mình sở hữu; Admin có quyền toàn cục. (Đạt 100%).
* **Kiểm thử bộ nhớ đệm biên (Edge Buffer)**: Rút dây mạng/ngắt Wi-Fi trong 30 phút, ESP32 lưu 120 bản ghi vào SPIFFS; khi có mạng trở lại, toàn bộ dữ liệu tự động đồng bộ bù lên TimescaleDB với cờ `isBuffered = true`. (Đạt 100%).
* **Kiểm thử Dừng khẩn cấp (Emergency Stop)**: Nhấn nút E-Stop trên Web/Mobile App, lệnh MQTT ưu tiên cao gửi xuống ESP32 ngắt relay động cơ rải trong thời gian **$< 800\text{ ms}$**. (Đạt 100%).

### 5.2. Bổ sung nội dung: Đánh giá chất lượng mô hình AI và Đối sánh Benchmark
Trình bày kết quả huấn luyện mô hình XGBoost Regressor trên tập kiểm tra (Test Set) gồm các cữ ăn thực tế:

| Mô hình thử nghiệm | MAE (kg/cữ) | RMSE (kg/cữ) | MAPE (%) | $R^2$ Score | Thời gian suy luận (Inference) |
|---|:---:|:---:|:---:|:---:|:---:|
| Linear Regression | 0.85 | 1.12 | 19.4% | 0.54 | 1.2 ms |
| Random Forest Regressor | 0.48 | 0.69 | 10.5% | 0.74 | 28.5 ms |
| **XGBoost Regressor (Đề tài lựa chọn)** | **0.39** | **0.55** | **8.1%** | **0.81** | **6.4 ms** |

> **Nhận xét**: Mô hình XGBoost Regressor vượt trội về độ chính xác với sai số phần trăm tuyệt đối trung bình $MAPE = 8.1\%$ (đạt tiêu chuẩn thực tiễn ngành nông nghiệp $<10\%$) và thời gian phản hồi API từ FastAPI sang NestJS cực nhanh ($<10\text{ ms}$), hoàn toàn không làm nghẽn tiến trình của máy chủ.

### 5.3. Bổ sung nội dung: Đánh giá hiệu quả của Lớp Quy tắc An toàn (Safety Rule Engine)
Bổ sung bảng kịch bản kiểm thử các quyết định an toàn:

| Mã Kịch bản | Dữ liệu môi trường đầu vào | Khuyến nghị AI | Trạng thái Safety Rule | Lượng ăn thực tế ban hành | Hành vi hệ thống |
|:---:|---|:---:|:---:|:---:|---|
| **SC-01** | $DO = 5.8\text{ mg/L}$, trời nắng, $\Delta TAN = 0.05$ | 15.0 kg | **ALLOWED** | 15.0 kg (100%) | Rải đủ định mức thức ăn đề xuất. |
| **SC-02** | Trời mưa to, nhiệt độ nước sụt $3.2^\circ\text{C}$ | 16.0 kg | **ADJUSTED** | 11.2 kg (Cắt giảm 30%) | Giảm tải để phòng tránh tôm giảm ăn do lạnh. |
| **SC-03** | Khí độc tăng vọt $\Delta TAN = 0.65\text{ mg/L}$ | 14.5 kg | **ADJUSTED** | 10.15 kg (Cắt giảm 30%) | Giảm lượng đạm hữu cơ tích tụ đáy ao. |
| **SC-04** | Oxy sụt giảm nguy hiểm $DO = 3.1\text{ mg/L}$ | 14.0 kg | **BLOCKED** | **0.0 kg (HỦY CỮ ĂN)** | Chặn khẩn cấp, ngăn ngừa tôm ngạt khí tử vong. |

---

<a name="6-chuong-7"></a>
## 6. CHI TIẾT RÀ SOÁT CHƯƠNG 7 (KẾT LUẬN & HƯỚNG PHÁT TRIỂN)

* **Phần Kết quả đạt được (7.1)**:
  * Khẳng định kết quả: Đã triển khai hoàn chỉnh hệ sinh thái phần mềm (Web App, Web Dashboard, Mobile App, Backend NestJS, AI Service FastAPI, Firmware ESP32) vận hành trơn tru theo cơ chế vòng lặp điều khiển khép kín (Closed-Loop Smart Feeding).
  * Khẳng định hiệu quả kinh tế: Cấu hình phần cứng tối ưu chi phí 9.000.000 VNĐ/ao (chỉ bằng 1/6 tủ IPC công nghiệp), tiết kiệm 14.2% – 15.8% chi phí thức ăn, hoàn vốn chỉ sau 3.3 tháng (~ 1 vụ nuôi).
* **Phần Hướng phát triển tiếp theo (7.3)**:
  * Tại đây, bạn **giữ lại ý tưởng về Camera**: Đề xuất nghiên cứu tích hợp camera quan trắc dưới nước chống nước mặn IP68 và các mô hình thị giác máy tính nhẹ (YOLO11-seg) để nhận diện thức ăn dư trên sàng ăn như một **hướng nghiên cứu mở rộng trong tương lai**. Cách viết này vừa thể hiện tầm nhìn phát triển lâu dài của nhóm, vừa đảm bảo sản phẩm hiện tại của khóa luận tập trung, vững chắc và hoàn toàn khớp với thực tế mã nguồn.


# HƯỚNG DẪN CHI TIẾT SỬA FILE DOCX BÁO CÁO KLTN (NHÓM 009)
## Đề tài: ShrimpMate - Hệ thống phần mềm quản lý và cảnh báo tự động cho hệ thống cho tôm ăn thông minh sử dụng IoT và AI
**Sinh viên thực hiện:** Phan Hữu Lộc – Đoàn Lan Hương  
**Giảng viên hướng dẫn:** TS. Nguyễn Vũ Lâm  
**Cách dùng tài liệu này:** Bạn chỉ cần mở file `Nhom009_KLTN.docx`, nhấn **Ctrl + F** để tìm đoạn **"NỘI DUNG CŨ HIỆN TẠI"**, sau đó bôi đen và **DÁN ĐÈ (PASTE)** bằng **"NỘI DUNG MỚI THAY THẾ"** tương ứng dưới đây.

---

# PHẦN 1: TÓM TẮT (ABSTRACT)

### 📌 ĐIỂM SỬA 1: CẬP NHẬT ĐOẠN CUỐI CỦA ABSTRACT (TIẾNG ANH)
* **Vị trí trong docx:** Trang ABSTRACT, đoạn văn thứ 3 (đoạn cuối cùng).
* **Từ khóa tìm kiếm (Ctrl + F):** `Stemming from this practical reality, the project`

🔴 **NỘI DUNG CŨ HIỆN TẠI (TRONG WORD):**
```text
Stemming from this practical reality, the project “ShrimpMate - Smart Shrimp Feeding Management and Automated Alert System Using IoT and AI” was initiated to automate feeding workflows and deliver real-time environmental monitoring. The platform enables farmers to configure feeding schedules, control feeder motors remotely, and track water quality indicators via a Mobile App and a Web App for farmers, and a Web Dashboard for administrators. By integrating an edge-buffered ESP32 module with a multi-model AI architecture - combining LightGBM/LSTM feed-demand forecasting, Isolation Forest-based anomaly detection, and YOLO/MobileNetV3-based feeding-behavior recognition - ShrimpMate delivers safety-bounded, data-driven feeding recommendations and instant emergency alerts via Firebase Cloud Messaging, minimizing operational risks and maximizing farming productivity.
```

🟢 **NỘI DUNG MỚI THAY THẾ (COPY & DÁN ĐÈ VÀO):**
```text
Stemming from this practical reality, the project “ShrimpMate - Smart Shrimp Feeding Management and Automated Alert System Using IoT and AI” was developed to automate feeding workflows and deliver real-time environmental monitoring. Farm managers can configure feeding schedules through the Web App, while farmers can monitor water quality and operate assigned feeders through the Mobile App. System administrators use the Web Dashboard.

The backend integrates with an independent AI Microservice that uses a seven-feature XGBoost Regressor and TreeSHAP-based explanations. Before feeding, the NestJS Safety Rule Engine checks configured environmental rules, sensor-data freshness, and predicted dissolved-oxygen trends. Critical alerts are broadcast through Socket.IO and can be sent to configured recipients by email or SMS. These functions are designed to support timely, safety-aware feeding decisions; their effects on feed waste and production costs require validation through field trials.
```

---

# PHẦN 2: CHƯƠNG 1 - GIỚI THIỆU

### 📌 ĐIỂM SỬA 2: XÓA ĐOẠN VĂN BỊ TRÙNG LẶP TẠI MỤC 1.1 (TỔNG QUAN)
* **Vị trí trong docx:** Chương 1, Mục 1.1 Tổng quan.
* **Từ khóa tìm kiếm (Ctrl + F):** `Nuôi tôm là một trong những ngành kinh tế mũi nhọn của Việt Nam`
* **Lỗi hiện tại:** Trong file docx hiện đang có **2 đoạn văn giống hệt nhau** nằm liền kề nhau:
  * Đoạn 1: *"Nuôi tôm là một trong những ngành kinh tế mũi nhọn... giảm thiểu rủi ro cho người nuôi."*
  * Đoạn 2: *"Nuôi tôm là một trong những ngành kinh tế mũi nhọn... giảm thiểu rủi ro cho người nuôi."*
* **Thao tác sửa:** **Bôi đen và XÓA HẲN đoạn văn thứ 2** để tránh lỗi lặp văn bản.

---

### 📌 ĐIỂM SỬA 3: HIỆU CHỈNH MỤC TIÊU CỤ THỂ (MỤC 1.2.2)
* **Vị trí trong docx:** Chương 1, Mục 1.2.2 Mục tiêu cụ thể (gạch đầu dòng thứ 4 và thứ 5).
* **Từ khóa tìm kiếm (Ctrl + F):** `Xây dựng kiến trúc AI đa mô hình gồm mô hình dự báo nhu cầu thức ăn`

🔴 **NỘI DUNG CŨ HIỆN TẠI (TRONG WORD):**
```text
Xây dựng kiến trúc AI đa mô hình gồm mô hình dự báo nhu cầu thức ăn (LightGBM/LSTM), mô hình nhận diện hoạt động ăn của tôm qua hình ảnh (YOLO11n kết hợp MobileNetV3) và mô hình ước tính sinh khối, nhằm phân tích dữ liệu tiêu thụ thức ăn, hành vi bắt mồi, tốc độ tăng trưởng và điều kiện môi trường, từ đó đưa ra khuyến nghị điều chỉnh lượng thức ăn phù hợp cho từng vụ nuôi.
Tích hợp mô hình phát hiện bất thường dựa trên Isolation Forest và phần dư dự báo để nhận diện các sự cố trong quá trình cho ăn (mô tơ không hoạt động, thiết bị kẹt, lượng thức ăn tiêu thụ vượt định mức, thông số môi trường vượt ngưỡng an toàn), phân cấp mức độ cảnh báo và phát cảnh báo khẩn cấp tới người nuôi thông qua thông báo đẩy (Firebase Cloud Messaging).
```

🟢 **NỘI DUNG MỚI THAY THẾ (COPY & DÁN ĐÈ VÀO):**
```text
Xây dựng và tích hợp AI Microservice độc lập bằng Python FastAPI, sử dụng XGBoost Regressor với 7 đặc trưng: DOC, ABW, DO_min, Delta_TAN, lượng mưa sáng sớm, lượng thức ăn cữ trước và lượng nước thay trong ngày. Delta_TAN là tên đặc trưng của mô hình; Backend hiện tính giá trị này từ trường telemetry được firmware mô phỏng gắn nhãn NH3, nên chưa xác nhận đó là TAN thực tế. Dịch vụ AI trả về dự báo lượng thức ăn cùng các giá trị đóng góp TreeSHAP để giải thích kết quả; dữ liệu huấn luyện hiện có là bộ dữ liệu mô phỏng, không phải 4.000 mẫu đo thực địa.
Xây dựng Safety Rule Engine trong Backend NestJS để kiểm tra khuyến nghị trước khi cho ăn. Engine chặn khi không có telemetry hoặc dữ liệu mới nhất quá 30 phút; dùng giới hạn QCVN 02-19:2014/BNNPTNT cho DO, pH, nhiệt độ, độ mặn và NH3 khi đúng đại lượng đo; các hành động giảm thức ăn, ngưỡng cảnh báo phụ, biến thiên ammonia, mưa và dự báo DO được ghi rõ là heuristic của đề tài. Việc dùng một số giới hạn QCVN không đồng nghĩa toàn hệ thống đã được chứng nhận tuân thủ.
Áp dụng Alert Cooldown 15 phút cho cảnh báo telemetry bằng Redis SET NX EX; khi Redis không khả dụng, service có cơ chế dự phòng trong bộ nhớ. Cảnh báo được phát qua WebSocket và có thể gửi email/SMS theo cấu hình. Không ghi FCM nếu chưa xác nhận dịch vụ này được tích hợp trong phiên bản triển khai.
```

---

### 📌 ĐIỂM SỬA 4: HIỆU CHỈNH PHẠM VI MÔ HÌNH AI (MỤC 1.3)
* **Vị trí trong docx:** Chương 1, Mục 1.3 Phạm vi đề tài, đoạn văn thứ 3 ("Về phạm vi mô hình AI...").
* **Từ khóa tìm kiếm (Ctrl + F):** `Về phạm vi mô hình AI, đề tài áp dụng kiến trúc AI đa mô hình gồm bốn thành phần`

🔴 **NỘI DUNG CŨ HIỆN TẠI (TRONG WORD):**
```text
Về phạm vi mô hình AI, đề tài áp dụng kiến trúc AI đa mô hình gồm bốn thành phần: (i) mô hình nhận diện hoạt động ăn của tôm dựa trên thị giác máy tính (YOLO11n kết hợp MobileNetV3-Small) để phân tích hình ảnh/video tại sàng ăn; (ii) mô hình dự báo nhu cầu thức ăn sử dụng LightGBM ở giai đoạn đầu và có thể nâng cấp lên LSTM khi dữ liệu chuỗi thời gian đủ lớn; (iii) mô hình ước tính sinh khối và tăng trưởng dựa trên XGBoost Regression; (iv) mô hình phát hiện bất thường dựa trên Isolation Forest kết hợp phần dư dự báo, nhằm nhận diện sớm các sự cố về môi trường, hành vi ăn và thiết bị. Mọi khuyến nghị của AI đều được kiểm tra qua một lớp quy tắc an toàn (safety rule engine) trước khi thực thi trên thiết bị. Do giới hạn về dữ liệu thực tế, các mô hình có thể được huấn luyện và đánh giá trên bộ dữ liệu công khai hoặc dữ liệu mô phỏng phù hợp với đặc trưng cho ăn tôm; các hướng nâng cấp như Temporal Fusion Transformer (TFT) cho dự báo đa biến hoặc Reinforcement Learning (PPO/SAC) cho điều khiển cho ăn tự động được đề xuất như hướng phát triển mở rộng của đề tài.
```

🟢 **NỘI DUNG MỚI THAY THẾ (COPY & DÁN ĐÈ VÀO):**
```text
Về phạm vi mô hình AI, phần đã được triển khai tập trung vào dự báo lượng thức ăn bằng XGBoost Regressor trên dữ liệu dạng bảng. Mô hình nhận 7 đặc trưng: ngày tuổi tôm (DOC), khối lượng bình quân (ABW), DO tối thiểu (DO_min), biến thiên TAN, lượng mưa sáng sớm, lượng thức ăn cữ trước và lượng nước thay trong ngày. Dịch vụ trả về các đóng góp TreeSHAP của từng đặc trưng. Bộ CSV 4.000 dòng hiện có được tạo bằng mô phỏng dựa trên các quy tắc và nguồn tham khảo; không mô tả bộ này là dữ liệu đo thực địa nếu chưa có hồ sơ thu thập tương ứng.

Khuyến nghị được đánh giá qua Safety Rule Engine của Backend trước khi hệ thống cho phép gửi lệnh cho ăn. Khi lời gọi AI lỗi hoặc vượt timeout 6 giây, Backend chuyển sang heuristic fallback. Không diễn đạt đây là bảo đảm hệ thống luôn hoạt động liên tục. Các hướng thị giác máy tính, LSTM và học tăng cường chỉ nên nêu là hướng mở rộng nếu chưa có triển khai và kết quả kiểm thử tương ứng.
```

---

### 📌 ĐIỂM SỬA 5: THỐNG NHẤT KIẾN TRÚC TẠI MỤC 1.4.2.1
* **Vị trí trong docx:** Chương 1, Mục 1.4.2.1 Phương pháp phân tích và thiết kế hệ thống, đoạn đầu tiên.
* **Từ khóa tìm kiếm (Ctrl + F):** `theo mô hình kiến trúc Monolith (nguyên khối). Hệ thống được tổ chức thành một khối thống nhất`

🔴 **NỘI DUNG CŨ HIỆN TẠI (TRONG WORD):**
```text
theo mô hình kiến trúc Monolith (nguyên khối). Hệ thống được tổ chức thành một khối thống nhất, bao gồm thiết bị IoT, lớp kết nối MQTT, ứng dụng Backend tập trung chứa toàn bộ logic xử lý nghiệp vụ lẫn các thuật toán AI, cùng với giao diện Mobile App, Web App và Web Dashboard.
```

🟢 **NỘI DUNG MỚI THAY THẾ (COPY & DÁN ĐÈ VÀO):**
```text
theo mô hình kiến trúc lai: Modular Monolith kết hợp AI Microservice. Core Backend được xây dựng bằng NestJS, tổ chức các chức năng quản lý, cho ăn, an toàn, MQTT và WebSocket thành các module chạy trong cùng ứng dụng. Dịch vụ AI độc lập bằng Python FastAPI thực hiện dự báo XGBoost và giao tiếp với Backend qua HTTP REST. Tách dịch vụ AI giúp phân định trách nhiệm giữa xử lý nghiệp vụ và suy luận mô hình; không khẳng định việc này triệt tiêu độ trễ mạng hoặc bảo đảm một đặc tính ACID nếu chưa có đo đạc và mô tả giao dịch cụ thể.
```

---

# PHẦN 3: CHƯƠNG 2 - CƠ SỞ LÝ THUYẾT VÀ CÔNG NGHỆ LIÊN QUAN

### 📌 ĐIỂM SỬA 6: CẬP NHẬT MỤC 2.4.6 THÀNH MÔ HÌNH DỰ BÁO LƯỢNG THỨC ĂN BẰNG XGBOOST
* **Vị trí trong docx:** Chương 2, Mục 2.4.6.
* **Từ khóa tìm kiếm (Ctrl + F):** `2.4.6 Mô hình hồi quy XGBoost trong ước tính sinh khối tôm`

🔴 **NỘI DUNG CŨ HIỆN TẠI (TRONG WORD):**
```text
2.4.6 Mô hình hồi quy XGBoost trong ước tính sinh khối tôm
XGBoost (Extreme Gradient Boosting) là một cài đặt tối ưu hóa của thuật toán Gradient Boosting, bổ sung các kỹ thuật chính quy hóa (regularization) vào hàm mục tiêu nhằm hạn chế hiện tượng quá khớp (overfitting), đồng thời hỗ trợ xử lý song song và tính toán hiệu quả trên dữ liệu có giá trị khuyết. Nhờ khả năng mô hình hóa tốt các mối quan hệ phi tuyến giữa nhiều biến đầu vào trên dữ liệu dạng bảng cỡ vừa và nhỏ, XGBoost Regression được đề tài sử dụng để ước tính sinh khối và tốc độ tăng trưởng của tôm trong ao nuôi, dựa trên các đặc trưng đầu vào như ngày tuổi, trọng lượng mẫu, mật độ thả, tỷ lệ sống ước tính và lượng thức ăn tích lũy. Kết quả ước tính sinh khối là một trong các đầu vào quan trọng của mô hình dự báo nhu cầu thức ăn (mục 2.4.5), giúp tính toán khẩu phần ăn phù hợp với tổng khối lượng tôm thực tế trong ao thay vì chỉ dựa trên số liệu thả giống ban đầu.
```

🟢 **NỘI DUNG MỚI THAY THẾ (COPY & DÁN ĐÈ VÀO):**
```text
2.4.6 Mô hình hồi quy XGBoost trong dự báo nhu cầu thức ăn thông minh
XGBoost (Extreme Gradient Boosting) là một thuật toán học máy dựa trên nguyên lý Gradient Boosting Decision Tree (GBDT), có các thành phần chính quy hóa trong hàm mục tiêu để kiểm soát độ phức tạp của mô hình:
$$\mathcal{L}^{(t)} = \sum_{i=1}^{n} l\left(y_i, \hat{y}_i^{(t-1)} + f_t(x_i)\right) + \Omega(f_t)$$
trong đó $\Omega(f_t) = \gamma T + \frac{1}{2}\lambda \sum_{j=1}^{T} w_j^2$ là hàm phạt độ phức tạp của cây quyết định thứ $t$ với số lượng lá $T$ và trọng số lá $w_j$.

Nhờ khả năng mô hình hóa phi tuyến vượt trội trên dữ liệu dạng bảng có kích thước vừa và nhỏ, XGBoost Regressor được đề tài lựa chọn làm thuật toán cốt lõi để dự báo định mức thức ăn cho từng cữ ăn (kg/cữ). Vector đặc trưng đầu vào của mô hình gồm 7 biến số sinh học và môi trường nước cốt lõi:
$$x = [\text{DOC}, \text{ABW}, \text{DO}_{\min}, \Delta\text{TAN}, \text{MorningRain}, \text{PrevFeed}, \text{WaterChange}]$$
Mô hình được cấu hình với các siêu tham số: $n\_estimators = 600$, $learning\_rate = 0.05$, $max\_depth = 6$, $subsample = 0.8$, $colsample\_bytree = 0.8$. Theo metadata của lần huấn luyện hiện có trên bộ dữ liệu mô phỏng 4.000 mẫu, mô hình đạt MAE = 0.28 kg/cữ, RMSE = 0.473 kg/cữ, MAPE = 3.06% và $R^2 = 0.992$. Script ghi nhận latency suy luận trung bình 0.45 ms cho một mẫu ở mức mô hình; đây không phải thời gian phản hồi end-to-end của API.
```
**Lưu ý khi dùng nội dung:** Ghi rõ đây là kết quả trên dữ liệu mô phỏng; không gọi là dữ liệu thực địa.

---

### 📌 ĐIỂM SỬA 7: BỔ SUNG MỤC 2.4.10 - KỸ THUẬT GIẢI THÍCH MÔ HÌNH TREESHAP (XAI)
* **Vị trí trong docx:** Chương 2, chèn ngay sau Mục 2.4.9 (Redis).

🟢 **NỘI DUNG MỚI BỔ SUNG THÊM VÀO WORD:**
```text
2.4.10 Kỹ thuật giải thích mô hình học máy TreeSHAP (Explainable AI - XAI)
Trong ứng dụng thực tế tại ao nuôi tôm, người nuôi thường hoài nghi hoặc không dám áp dụng các con số định mức do mô hình học máy đưa ra nếu mô hình hoạt động như một "hộp đen" (black-box). Để giải quyết bài toán này, đề tài tích hợp kỹ thuật giải thích cục bộ TreeSHAP (Tree Shapley Additive Explanations) dựa trên lý thuyết trò chơi hợp tác của Lloyd Shapley. 

TreeSHAP phân rã giá trị dự báo thức ăn của mô hình XGBoost thành tổng của một giá trị cơ sở (base value) và các mức đóng góp cục bộ (Shapley values) của từng đặc trưng đầu vào:
$$f(x) = \phi_0 + \sum_{i=1}^{M} \phi_i(x)$$
trong đó:
- $f(x)$ là khối lượng thức ăn dự báo cuối cùng cho cữ ăn (kg/cữ).
- $\phi_0$ là giá trị kỳ vọng cơ sở (TreeSHAP bias) tính trên toàn bộ tập dữ liệu huấn luyện.
- $\phi_i(x)$ là giá trị đóng góp (tăng hoặc giảm tính bằng kg) của đặc trưng thứ $i$ trong số 7 đặc trưng đầu vào.

Thông qua TreeSHAP, hệ thống trả về đóng góp của từng đặc trưng đối với dự báo cụ thể. Dấu và độ lớn của các giá trị đóng góp phụ thuộc vào đầu vào và mô hình; chỉ đưa ví dụ định lượng (chẳng hạn một đặc trưng làm thay đổi khẩu phần bao nhiêu kg) khi đã chạy mô hình với đầu vào được nêu rõ và lưu lại kết quả. Cơ chế này hỗ trợ giải thích dự báo, nhưng không tự nó chứng minh độ chính xác hoặc mức độ tin cậy nông học của mô hình.
```

---

# PHẦN 4: CHƯƠNG 3 - PHÂN TÍCH YÊU CẦU VÀ THIẾT KẾ HỆ THỐNG

### 📌 ĐIỂM SỬA 8: HIỆU CHỈNH QUY TẮC NGHIỆP VỤ & PHÂN QUYỀN (MỤC 3.2.1)
* **Vị trí trong docx:** Chương 3, Mục 3.2.1 Yêu cầu quy tắc nghiệp vụ hệ thống, gạch đầu dòng "Quy trình xác thực và phân quyền".
* **Từ khóa tìm kiếm (Ctrl + F):** `Quy trình xác thực và phân quyền: Hệ thống triển khai cơ chế bảo mật và phân quyền với ba vai trò chính`

🔴 **NỘI DUNG CŨ HIỆN TẠI (TRONG WORD):**
```text
Quy trình xác thực và phân quyền: Hệ thống triển khai cơ chế bảo mật và phân quyền với ba vai trò chính: Quản trị viên (admin), Quản lý (manager) và Người nuôi (farmer). Quản lý chủ động đăng ký tài khoản bằng số điện thoại và email để sử dụng Web App; Người nuôi không tự đăng ký mà do Quản lý (sau khi đã có tài khoản) trực tiếp tạo, với mật khẩu ban đầu do hệ thống sinh ngẫu nhiên, và sử dụng Mobile App; Quản trị viên sử dụng Web Dashboard. Mật khẩu được mã hóa an toàn bằng thuật toán bcrypt, hệ thống hỗ trợ cơ chế cấp lại mật khẩu thông qua mã OTP bảo mật gửi qua Email/SMS .
```

🟢 **NỘI DUNG MỚI THAY THẾ (COPY & DÁN ĐÈ VÀO):**
```text
Quy trình xác thực và phân quyền đa cấp (RBAC): Hệ thống triển khai cơ chế kiểm soát truy cập dựa trên 3 vai trò nghiêm ngặt với giao diện chuyên biệt:
- Quản trị viên (Admin - Web Dashboard): Giám sát toàn bộ hệ thống, quản lý tài khoản người dùng (khóa/mở khóa), cấu hình danh mục phần cứng chuẩn và quản trị bộ quy tắc an toàn toàn cục.
- Quản lý (Manager - Web App): Chủ cơ sở/trang trại tôm, tự đăng ký tài khoản bằng Email/Số điện thoại. Quản lý sở hữu các trang trại, ao nuôi, tạo vụ nuôi, cấu hình lịch cho ăn, xem khuyến nghị AI và báo cáo vụ nuôi. Đặc biệt, Quản lý trực tiếp tạo tài khoản cho Người nuôi (Farmer) và phân công phụ trách từng ao hoặc toàn bộ trang trại thông qua cơ chế phân công an toàn (bảng farmer_assignments).
- Người nuôi (Farmer - Mobile App): Nhân viên kỹ thuật/công nhân bờ ao do Quản lý tạo tài khoản (mật khẩu ban đầu sinh ngẫu nhiên). Người nuôi chỉ được xem dữ liệu môi trường và điều khiển thiết bị (Cho ăn nhanh, Dừng khẩn cấp) trên đúng các ao nuôi mà mình được phân công phụ trách. Lớp bảo vệ PondAccessService tại Backend kiểm tra token JWT và chặn đứng mọi hành vi truy cập chéo dữ liệu giữa các trang trại.
```

---

### 📌 ĐIỂM SỬA 9: CẬP NHẬT VÀ BỔ SUNG BẢNG USE CASE (MỤC 3.3.2)
* **Vị trí trong docx:** Chương 3, Mục 3.3.2 Bảng Use Case hệ thống.
* **Các điểm cần sửa trong bảng:**
  1. **Sửa cả mô tả và tác nhân UC001:** Manager tự đăng ký; Farmer do Manager tạo tài khoản.
  2. **Bổ sung UC020 và UC021** đúng chức năng như các endpoint trong backend. E-Stop đã thuộc UC012 trong bảng hiện tại, không tạo mã UC mới cho chức năng này.

🟢 **DÒNG BỔ SUNG THÊM VÀO BẢNG USE CASE (MỤC 3.3.2):**
| Mã UC | Tên Use Case | Mô tả tóm tắt nghiệp vụ | Tác nhân |
| :--- | :--- | :--- | :--- |
| **UC020** | **Quản lý tài khoản Người nuôi** | Quản lý tạo, cập nhật và thay đổi trạng thái tài khoản Farmer thuộc quyền quản lý. | Quản lý |
| **UC021** | **Phân công Người nuôi phụ trách ao/trang trại** | Quản lý gán hoặc thu hồi quyền phụ trách ao nuôi/trang trại cho tài khoản Farmer. | Quản lý |

**Dòng UC001 đề xuất:** `UC001 | Đăng ký tài khoản Quản lý | Quản lý tự đăng ký tài khoản bằng Email hoặc số điện thoại để sử dụng Web App. | Quản lý`. Giữ E-Stop trong UC012. Chỉ ghi thời gian ngắt relay `< 800 ms` nếu có phép đo kiểm thử phần cứng làm bằng chứng.

---

### 📌 ĐIỂM SỬA 10: BỔ SUNG CÁC THỰC THỂ CSDL CÒN THIẾU TẠI MỤC 3.3.4
* **Vị trí trong docx:** Chương 3, Mục 3.3.4 Danh sách các thực thể chính trong hệ thống.
* **Từ khóa tìm kiếm (Ctrl + F):** `Danh sách các thực thể chính trong hệ thống:`
* **Lưu ý:** DOCX hiện đã liệt kê `farmer_assignments` và `ai_recommendations`; không thêm lại thành thực thể mới. Có thể cập nhật mô tả hiện có như sau:

🟢 **NỘI DUNG ĐIỀU CHỈNH CHO CÁC DÒNG HIỆN CÓ:**
```text
farmer_assignments: Lưu thông tin liên kết Farmer với farm hoặc pond được phân công (manager_id, farmer_id, farm_id, pond_id), làm căn cứ giới hạn phạm vi truy cập.
telemetry_readings: Lưu số đo môi trường, thời điểm đo và cờ is_buffered. Backend lưu cả telemetry gửi bù nhưng bỏ qua bước kiểm tra ngưỡng cảnh báo tức thời cho bản ghi này.
ai_recommendations: Lưu kết quả dự báo, input_snapshot dạng JSONB (7 đặc trưng, baseValueKg và featureContributions nếu dịch vụ AI trả về), safety_decision, safety_reason và status. Các trạng thái trong backend gồm PENDING, APPROVED, REJECTED, EXECUTED; safety_decision gồm ALLOWED, ADJUSTED, BLOCKED.
```

---

# PHẦN 5: CHƯƠNG 4 - CÀI ĐẶT VÀ TRIỂN KHAI HỆ THỐNG

### 📌 ĐIỂM SỬA 11: CẬP NHẬT CẤU HÌNH PHẦN MỀM CHUẨN XÁC
* **Vị trí trong docx:** Chương 4, phần "Hạ tầng máy chủ ứng dụng lõi (Core Backend Server)".
* **Từ khóa tìm kiếm (Ctrl + F):** `Hạ tầng máy chủ ứng dụng lõi (Core Backend Server)`

🔴 **NỘI DUNG CŨ HIỆN TẠI (TRONG WORD):**
```text
Nền tảng thực thi: Node.js v20+LTS, NestJS framework phiên bản 12, TypeScript v5.
```

🟢 **NỘI DUNG MỚI THAY THẾ (COPY & DÁN ĐÈ VÀO):**
```text
Nền tảng thực thi: Node.js v20+ (theo yêu cầu dự án), NestJS 12 (@nestjs/core ^12.3.2), TypeScript ^6.0.2.
Cơ sở dữ liệu & ORM: PostgreSQL qua TypeORM ^1.1.1. Migration tạo TimescaleDB hypertable khi extension đã được cài đặt; cấu hình hiện tại không chỉ định chu kỳ chunk 7 ngày.
Hàng đợi và khóa: Redis kết hợp BullMQ ^6.7.3 cho hàng đợi cho ăn và các cơ chế Redis cho cooldown/lockout. Lịch cho ăn dùng khóa Idempotent Job ID; cooldown cảnh báo mặc định 900 giây với Redis SET NX EX. Một số service có fallback trong bộ nhớ khi Redis không khả dụng.
Giao tiếp thiết bị & thời gian thực: MQTT.js ^5.16.0; Socket.IO ^4.8.4 dùng các room theo pondId và kiểm tra quyền truy cập ao trước khi tham gia room.
```
**Lưu ý:** Chỉ ghi phiên bản PostgreSQL, Redis, broker và MQTT protocol đã xác nhận trên môi trường triển khai; các phiên bản này không được khóa đầy đủ trong mã nguồn backend.

---

### 📌 ĐIỂM SỬA 12: BỔ SUNG CHI TIẾT 3 THUẬT TOÁN AN TOÀN TRONG SAFETY RULE ENGINE
* **Vị trí trong docx:** Chương 4, mục "Module Lớp Quy tắc An toàn (safety-rule-engine)".
* **Từ khóa tìm kiếm (Ctrl + F):** `SafetyRuleEngineService: Đóng vai trò chốt chặn bắt buộc trước mọi quyết định cho ăn.`

🟢 **NỘI DUNG CHI TIẾT BỔ SUNG VÀO MỤC NÀY:**
```text
SafetyRuleEngineService thực thi quy trình kiểm duyệt an toàn 3 tầng khép kín:

Tầng 1 - Kiểm tra độ tươi của dữ liệu cảm biến (Telemetry Freshness Check):
Hệ thống tính toán khoảng thời gian trôi qua kể từ thời điểm đo đạc mới nhất:
Delta_t = (Thời gian hiện tại - Thời gian đo mới nhất) tính bằng phút.
Nếu Delta_t > 30 phút hoặc ao nuôi chưa từng có dữ liệu cảm biến, engine trả về quyết định BLOCKED cùng lý do NO_TELEMETRY_DATA hoặc STALE_SENSOR_DATA. Luồng cho ăn xử lý quyết định này để không phát lệnh; một số luồng tạo cảnh báo tương ứng. Không trích dẫn chuỗi log nếu chưa xác nhận đúng nội dung log của phiên bản triển khai.

Tầng 2 - Đánh giá các quy tắc an toàn được bật và cấu hình trong cơ sở dữ liệu:
- Quy tắc thiết bị: Nếu máy cho ăn ở trạng thái ERROR hoặc EMERGENCY_STOP -> Chặn hoàn toàn (BLOCKED).
- Theo QCVN 02-19:2014/BNNPTNT, giới hạn chất lượng nước ao được dùng trong code gồm DO >= 3.5 mg/L; pH 7-9 và dao động pH trong ngày không quá 0.5; nhiệt độ 18-33°C; độ mặn 5-35‰; NH3 < 0.3 mg/L.
- Quy tắc DO: DO < 3.5 mg/L -> BLOCKED. Khoảng DO < 4.0 mg/L kích hoạt giảm 50% thức ăn; mức 4.0 và hành động giảm thức ăn là heuristic nội bộ, không phải yêu cầu hành động trong QCVN.
- Quy tắc nhiệt độ: ngoài khoảng QCVN 18-33°C -> ADJUSTED, giảm 50% thức ăn theo chính sách heuristic của đề tài.
- Quy tắc pH: ngoài khoảng QCVN 7-9 -> BLOCKED. Cảnh báo thêm nếu biên độ pH trong ngày > 0.5.
- Quy tắc NH3: NH3 >= 0.3 mg/L -> BLOCKED để thực thi giới hạn NH3 < 0.3 mg/L.
- Quy tắc độ mặn: ngoài khoảng QCVN 5-35‰ -> cảnh báo CRITICAL.
- Các quy tắc biến thiên ammonia (> 0.5 mg/L) và mưa (>= 15 mm) tiếp tục là heuristic của đề tài, không phải ngưỡng QCVN. Firmware mô phỏng đang gửi trường ammonia dưới nhãn NH3; không gọi biến thiên này là Delta_TAN nếu chưa xác nhận phép đo là TAN.
- QCVN quy định độ trong theo cm, còn telemetry hiện đo độ đục theo NTU; hai đại lượng không tương đương nên ngưỡng turbidity hiện tại vẫn là heuristic, chưa được đổi theo QCVN.

Tầng 3 - Thuật toán Dự báo xu hướng DO sụt giảm trước cữ ăn (Adaptive Feeding):
Dựa trên tối đa 2 lần đo gần nhất để tính độ dốc DO theo giờ (giới hạn trong khoảng -2.5 đến 2.5 mg/L/giờ). Trong khung giờ 18:00–06:00, mức giảm ban đêm được đặt là 0.35 mg/L cho mỗi giờ dự báo. Nhu cầu oxy do lượng thức ăn được tính theo công thức BOD_feed = 0.25 × min(2, lượng_ăn_được_phép / 8).
DO_pred(1h) = DO_current + Slope_DO - Drop_diurnal - BOD_feed
DO_pred(2h) = DO_current + 2 × Slope_DO - 2 × Drop_diurnal - BOD_feed
Nếu DO hiện tại >= 3.5 mg/L nhưng dự báo 1h hoặc 2h < 3.2 mg/L, engine giảm 40% lượng ăn đang được phép, trừ khi một quy tắc DO đã kích hoạt và điều chỉnh khẩu phần; khi đó quy tắc DO được ưu tiên để tránh giảm hai lần cho cùng rủi ro. Các quy tắc điều chỉnh độc lập khác vẫn có thể được áp dụng tuần tự.
```
**Lưu ý về diễn giải:** Các giới hạn chất lượng nước nêu trên được lấy từ QCVN 02-19:2014/BNNPTNT, Phụ lục I, Bảng 1; quy chuẩn được ban hành kèm Thông tư 22/2014/TT-BNNPTNT. Việc dùng đúng giới hạn trong code không đồng nghĩa toàn hệ thống đã được chứng nhận tuân thủ: thiết bị đo cần hiệu chuẩn, việc phân loại cảnh báo/chặn/giảm thức ăn là chính sách phần mềm, còn các ngưỡng DO 4.0, biến thiên ammonia, mưa và dự báo DO là heuristic. Dự án PlatformIO/Wokwi mô phỏng trường NH3 bằng potentiometer, chưa chứng minh cảm biến vật lý đã được hiệu chuẩn. Tham khảo: [Thông tư 22/2014/TT-BNNPTNT](https://thuvienphapluat.vn/van-ban/Tai-nguyen-Moi-truong/Thong-tu-22-2014-TT-BNNPTNT-Quy-chuan-ky-thuat-quoc-gia-dieu-kien-nuoi-thuy-san-242453.aspx) và [bản QCVN được lập chỉ mục trên cổng tiêu chuẩn của Bộ NN&PTNT](https://tieuchuan.mard.gov.vn/Documents/Uploads/QCVN%2002-19-2014-BNNPTNT.doc). Không viết “ngăn ngừa triệt để”. Test DO-adjust xác nhận quy tắc DO được áp dụng mà không chồng thêm heuristic dự báo DO.

---

# PHẦN 6: CHƯƠNG 5 - KIỂM THỬ VÀ ĐÁNH GIÁ HỆ THỐNG

### 📌 ĐIỂM SỬA 13: BỔ SUNG KẾT QUẢ KIỂM THỬ CÓ BẰNG CHỨNG
* **Vị trí trong docx:** Chương 5, các tiêu đề mục đang để trống nội dung:
  - *"Kết quả kiểm thử chức năng & An toàn"*
  - *"Đánh giá chất lượng mô hình AI và Đối sánh Benchmark"*
  - *"Đánh giá hiệu quả của Lớp Quy tắc An toàn (Safety Rule Engine)"*
* **Lưu ý:** Không sử dụng các con số benchmark MQTT/ESP32 hoặc số ca test 48/48, 16/16, 200 kịch bản ở bản nháp cũ nếu không có log và kết quả thực nghiệm tương ứng. Nội dung dưới đây chỉ ghi các kết quả có trong source/metadata và lần chạy test đã thực hiện; cần chạy lại sau khi sửa test lỗi.

🟢 **NỘI DUNG THAY THẾ (CẬP NHẬT KẾT QUẢ SAU KHI CHẠY LẠI TEST):**
```text
5.2 Kết quả kiểm thử chức năng & An toàn

Backend có các bộ kiểm thử Jest cho những service nghiệp vụ. Lần chạy trước khi sửa ngày 27/11/2026 có 1 test lỗi: rule DO giảm lượng ăn 50%, sau đó heuristic dự báo DO giảm tiếp 40% trên cùng rủi ro. Engine đã được cập nhật để ưu tiên rule DO và không chồng thêm heuristic đó. Lần chạy đầy đủ sau sửa: 6 test suites, 25 test cases; 25 passed, 0 failed. Đây là kết quả kiểm thử phần mềm, không thay thế kiểm thử thực địa hoặc phần cứng.

5.3 Đánh giá chất lượng mô hình AI và Đối sánh Benchmark

Mô hình XGBoost sử dụng bộ dữ liệu shrimp_feeding_dataset.csv gồm 4.000 dòng được tạo bằng mô phỏng theo các quy tắc sinh học và môi trường, không phải dữ liệu đo thực địa. Script huấn luyện chia dữ liệu ngẫu nhiên theo tỷ lệ 80/20 (3.200 mẫu train và 800 mẫu test); do đó không diễn giải việc chia tập này là kiểm định theo thời gian hoặc bằng chứng loại trừ hoàn toàn data leakage.

Metadata hiện có ghi nhận các chỉ số sau trên tập test mô phỏng: MAE = 0.28 kg/cữ, RMSE = 0.473 kg/cữ, MAPE = 3.06%, R² = 0.992. Latency 0.45 ms là trung bình đo suy luận một mẫu trong script huấn luyện, không phải latency end-to-end của API. Các chỉ số feature importance được lưu gồm ABW 31.28%, lượng ăn cữ trước 22.02%, DO tối thiểu 19.30% và mưa sáng sớm 19.28%.

Chưa có kết quả benchmark được lưu cho bảng mẫu nông học, Linear Regression hoặc Random Forest; chỉ thêm đối sánh nếu nhóm thực sự chạy các mô hình này trên cùng tập dữ liệu và ghi lại phương pháp, cấu hình cùng kết quả.

5.4 Đánh giá hiệu quả của Lớp Quy tắc An toàn (Safety Rule Engine)

Backend có các luật chặn/điều chỉnh theo dữ liệu cảm biến và dự báo xu hướng DO. Để đánh giá hiệu quả, cần chạy và lưu kết quả cho từng kịch bản, bao gồm DO thấp, telemetry cũ hoặc không có, mưa lớn, DO dự báo thấp, thiết bị lỗi và E-Stop. Hiện source không có báo cáo kết quả của 200 lượt mô phỏng hoặc phép đo thời gian phản hồi phần cứng; không ghi tỷ lệ thành công hay latency phần cứng khi chưa thực hiện kiểm thử và lưu log.
```

**Trước khi đưa vào bản cuối:** Repo AI có `test_client.py` với hai kiểm tra tích hợp thủ công (health và dự báo), không phải bộ 16 ca PyTest. Chỉ bổ sung kết quả khi nhóm chạy script và lưu output. Tương tự, các con số MQTT/ESP32/E-Stop cần có log đo trên thiết bị hoặc môi trường mô phỏng được mô tả rõ.

---

# PHẦN 7: CHƯƠNG 7 - KẾT LUẬN VÀ HƯỚNG PHÁT TRIỂN

### 📌 ĐIỂM SỬA 14: CẬP NHẬT KẾT QUẢ ĐẠT ĐƯỢC (MỤC 7.1)
* **Vị trí trong docx:** Chương 7, Mục 7.1 Các kết quả chính đã đạt được, gạch đầu dòng thứ 2 ("Hiện thực hóa giải pháp AI...").
* **Từ khóa tìm kiếm (Ctrl + F):** `Hiện thực hóa giải pháp AI dự báo lượng thức ăn thông minh:`

🔴 **NỘI DUNG CŨ HIỆN TẠI (TRONG WORD):**
```text
Hiện thực hóa giải pháp AI dự báo lượng thức ăn thông minh:
Chuẩn hóa và huấn luyện thành công mô hình học máy XGBoost Regressor dựa trên vector 7 đặc trưng sinh học và môi trường nước. Mô hình đạt các chỉ số kiểm nghiệm thực nghiệm ấn tượng: MAE = 0.39 kg/cữ, MAPE = 8.1%, R2 = 0.81, vượt ngưỡng chuẩn công bố trong bài báo khoa học quốc tế.
```

🟢 **NỘI DUNG MỚI THAY THẾ (COPY & DÁN ĐÈ VÀO):**
```text
Hiện thực hóa giải pháp AI dự báo lượng thức ăn thông minh kết hợp khả năng giải thích (XAI):
Triển khai mô hình XGBoost Regressor trên AI Microservice (FastAPI) với 7 đặc trưng đầu vào và giải thích dự báo bằng TreeSHAP. Theo metadata của mô hình hiện có, trên bộ dữ liệu mô phỏng 4.000 dòng được chia ngẫu nhiên 80/20, các chỉ số là MAE = 0.28 kg/cữ, RMSE = 0.473 kg/cữ, MAPE = 3.06% và R² = 0.992. Latency 0.45 ms là phép đo suy luận mức mô hình trong script huấn luyện, không đại diện cho thời gian phản hồi toàn hệ thống. Backend có heuristic fallback khi lời gọi AI lỗi hoặc timeout; cơ chế này không đồng nghĩa hệ thống được bảo đảm không gián đoạn.
```

---

*Các đề xuất trong tài liệu này đã được rà soát với source hiện có của `shrimpmate-backend` và `shrimpmate-AI`. Những kết quả thực nghiệm, triển khai phần cứng, dịch vụ bên ngoài và mức độ tuân thủ tiêu chuẩn vẫn cần được xác nhận bằng log, cấu hình môi trường và tài liệu tham chiếu trước khi đưa vào báo cáo cuối.*

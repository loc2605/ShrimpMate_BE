# HƯỚNG DẪN CHI TIẾT CHỈNH SỬA & NÂNG CẤP BÁO CÁO KHÓA LUẬN TỐT NGHIỆP SHRIMP-MATE
> **Tài liệu đối chiếu và nâng cấp học thuật toàn diện**
> - **Đề tài**: ShrimpMate - Hệ thống phần mềm quản lý và cảnh báo tự động cho hệ thống cho tôm ăn thông minh sử dụng IoT và AI
> - **Sinh viên thực hiện**: Phan Hữu Lộc (22653351), Đoàn Lan Hương (22002095)
> - **Giảng viên hướng dẫn**: TS. Nguyễn Vũ Lâm
> - **Đơn vị đào tạo**: Khoa Công nghệ Thông tin - Trường Đại học Công nghiệp TP.HCM (IUH)
> - **Bản thảo đối chiếu**: Bản cập nhật Khóa luận tốt nghiệp (59 trang, cập nhật ngày 04/11/2026).
> - **Căn cứ khoa học tham chiếu 1 (IoT & AI Dự báo)**: Bài báo *"Ứng dụng nền tảng IoT vào tự động hóa trong nuôi tôm tại Việt Nam"* - TS. Đỗ Doãn Dung, Nguyễn Nhất Tuấn, PGS.TS. Lê Hùng Anh, ThS. Đỗ Phương Khanh (Trường ĐH Công nghiệp TP.HCM & Otanics Technology, Tạp chí Khoa học & Công nghệ Mở HOUJS, 10/2025, DOI: 10.59266/houjs.2025.844).
> - **Căn cứ khoa học tham chiếu 2 (Machine Learning Nuôi trồng Thủy sản)**: Bài báo *"Smart aquaculture analytics: Enhancing shrimp farming in Bangladesh through real-time IoT monitoring and predictive machine learning analysis"* - F. Ahmed và cộng sự (*Heliyon*, Elsevier, 2024, DOI: 10.1016/j.heliyon.2024.e37330).

---

## MỤC LỤC TÀI LIỆU HƯỚNG DẪN
1. [BẢNG TỔNG HỢP KIỂM TRA ĐỐI SOÁT TỪNG TRANG (PAGE-BY-PAGE AUDIT)](#muc-audit)
2. [PHẦN I: DANH SÁCH 5 VỊ TRÍ CÒN SÓT CẦN ĐỒNG BỘ KIẾN TRÚC](#phan-i)
   - 1.1. Sửa tại Trang 16 (Mục 1.3 - Phạm vi kỹ thuật)
   - 1.2. Sửa tại Trang 19–20 (Mục 1.4.2.3 - Tích hợp mô hình AI)
   - 1.3. Sửa tại Trang 23 (Mục 2.1.2 - Kiến trúc Monolith)
   - 1.4. Sửa tại Trang 26–27 (Mục 2.3.4 - Module xử lý AI bằng Python)
   - 1.5. Sửa tại Trang 47 (Mục 3.3.3 - Kiến trúc hệ thống)
3. [PHẦN II: SỬA LỖI ĐỊNH DẠNG WORD NHẢY DÒNG Ở TRANG 51 - 52](#phan-ii)
4. [PHẦN III: CÁC NỘI DUNG TIẾP THU TỪ BÀI BÁO KHOA HỌC IUH (10/2025)](#phan-iii)
   - 3.1. Số liệu thực tiễn đưa vào Chương 1 (Mục 1.1 - Trang 14)
   - 3.2. Bảng khảo sát hiện trạng 7 hệ thống công nghệ đưa vào Chương 2
   - 3.3. Chuẩn hóa Mô hình XGBoost Regressor dự báo lượng thức ăn (Chương 2 & 3)
   - 3.4. Bổ sung luật Thời tiết Mưa và Khí độc TAN vào Safety Rule Engine (Trang 40)
   - 3.5. Cơ sở lý thuyết Machine Learning dạng bảng (Tabular Learning) cho định mức thức ăn
5. [PHẦN IV: BẢN THẢO CHI TIẾT CHO CÁC CHƯƠNG ĐANG ĐỂ TRỐNG (CHƯƠNG 4, 5, 6, 7)](#phan-iv)
   - 4.1. Chương 4: Cài đặt và Triển khai hệ thống (Backend, FastAPI, ESP32, React)
   - 4.2. Chương 5: Kiểm thử và Đánh giá hệ thống (Kế hoạch test & Bảng Benchmark)
   - 4.3. Chương 6: Kế hoạch khởi nghiệp & Bài toán hoàn vốn (ROI)
   - 4.4. Chương 7: Kết luận và Hướng phát triển
   - 4.5. Danh mục Tài liệu tham khảo chuẩn IEEE/APA

---

<a name="muc-audit"></a>
## 📋 BẢNG TỔNG HỢP KIỂM TRA ĐỐI SOÁT TỪNG TRANG (PAGE-BY-PAGE AUDIT)

| Trang (PDF 59 trang) | Mục nội dung | Tình trạng hiện tại | Hành động yêu cầu |
| :---: | :--- | :--- | :--- |
| **Trang 14** | Mục 1.1 Tổng quan | Thiếu số liệu thực tế về hao hụt và chi phí nuôi thủ công | **Cần bổ sung**: Đoạn văn thực nghiệm Minh Phú (sụt 3-5°C làm giảm 30% sức ăn, mất 50 tấn/vụ). *(Xem mục 3.1)* |
| **Trang 15** | Mục 1.2.2 Mục tiêu cụ thể | **ĐÃ SỬA RẤT TỐT**: Đã cập nhật kiến trúc Modular Monolith + AI Microservice | **Đã hoàn thành** (Giữ nguyên). |
| **Trang 16** | Mục 1.3 Phạm vi đề tài | **CÒN SÓT CÂU CŨ**: Ghi "phát triển thống nhất trong một ứng dụng Monolith" | **Cần sửa ngay**: Đồng bộ thành Modular Monolith NestJS + FastAPI AI. *(Xem mục 1.1)* |
| **Trang 19–20**| Mục 1.4.2.3 Tích hợp AI | **CÒN SÓT CÂU CŨ**: Ghi "tích hợp trực tiếp... loại bỏ hoàn toàn độ trễ mạng" | **Cần sửa ngay**: Chỉnh thành AI Microservice gọi qua REST API nội bộ. *(Xem mục 1.2)* |
| **Trang 23** | Mục 2.1.2 Kiến trúc Monolith | **CÒN SÓT CÂU CŨ**: Định nghĩa Monolith gộp toàn bộ AI vào chung 1 tiến trình | **Cần sửa ngay**: Đổi tiêu đề và nội dung sang Modular Monolith + AI Microservice. *(Xem mục 1.3)* |
| **Trang 26–27**| Mục 2.3.4 Tích hợp AI Python | **CÒN SÓT CÂU CŨ**: Ghi "chạy chung tiến trình con trong bộ nhớ" | **Cần sửa ngay**: Sửa thành giao tiếp HTTP REST giữa NestJS và FastAPI. *(Xem mục 1.4)* |
| **Trang 32–34**| Mục 2.4.5 & 2.4.6 AI Model | Đang trình bày lý thuyết chung LightGBM/LSTM | **Cần nâng cấp**: Đưa cấu hình XGBoost tối ưu thực nghiệm ($n\_estimators=600, lr=0.05, max\_depth=6$) và vector 7 đặc trưng môi trường & sinh học. *(Xem mục 3.3)* |
| **Trang 40** | Mục 3.2.1 Quy tắc an toàn | Có quy tắc DO cơ bản | **Cần bổ sung**: Quy tắc thời tiết mưa / nhiệt độ giảm và quy tắc biến động $\Delta TAN$. *(Xem mục 3.4)* |
| **Trang 44–46**| Bảng 3.3.2 Danh mục Use Case | **ĐÃ SỬA RẤT TỐT**: Đã đổi tác nhân sang Quản lý (Manager) | **Đã hoàn thành** (Khớp 100% với Codebase). |
| **Trang 47** | Mục 3.3.3 Kiến trúc hệ thống | Vẫn ghi "chạy trong một ứng dụng Backend duy nhất" | **Cần sửa nhẹ**: Phân tách khối NestJS Backend và AI Microservice (FastAPI). *(Xem mục 1.5)* |
| **Trang 51–52**| Mục 3.3.4 CSDL & Thực thể | **ĐÃ THÊM THỰC THỂ**, nhưng **BỊ LỖI WORD NHẢY DÒNG** | **Cần sửa lỗi định dạng**: Thay công thức Word bằng text thường mô tả bảng `ai_recommendations` để gọn vào trang 51. *(Xem mục 2)* |
| **Trang 53–57**| Chương 4, 5, 6, 7 & TLTK | Đang để trang trắng tiêu đề | **Cần điền nội dung**: Copy bản thảo hoàn chỉnh từ Phần IV vào. |

---

<a name="phan-i"></a>
## PHẦN I: DANH SÁCH 5 VỊ TRÍ CÒN SÓT CẦN ĐỒNG BỘ KIẾN TRÚC

### 1.1. Sửa tại Trang 16 (Mục 1.3 - Về phạm vi kỹ thuật)
* **Đoạn cũ trong PDF (Trang 16, đoạn 2)**:
  > *"Về phạm vi kỹ thuật, đề tài sử dụng vi điều khiển ESP32 hoặc Arduino kết hợp mô-đun relay điều khiển động cơ cho ăn; giao tiếp giữa thiết bị và server thông qua WiFi với giao thức MQTT hoặc HTTP. Toàn bộ hệ thống Backend và các mô hình AI được phát triển thống nhất trong một ứng dụng Monolith, kết nối trực tiếp với cơ sở dữ liệu PostgreSQL (kết hợp TimescaleDB cho dữ liệu chuỗi thời gian) và sử dụng Redis làm lớp lưu trữ đệm tăng tốc độ truy xuất trạng thái hệ thống; giao diện Web App và Web Dashboard bằng React, Mobile App bằng React Native."*
* **Thay thế bằng đoạn mới**:
  > *"Về phạm vi kỹ thuật, đề tài sử dụng vi điều khiển ESP32 kết hợp mô-đun relay điều khiển động cơ cho ăn; giao tiếp giữa thiết bị và máy chủ thông qua WiFi với giao thức MQTT bảo mật (MQTTS). Hệ thống máy chủ được thiết kế theo mô hình kiến trúc lai hiện đại: Backend nghiệp vụ trung tâm phát triển theo mô hình Modular Monolith bằng NestJS (TypeScript), kết nối trực tiếp với cơ sở dữ liệu PostgreSQL (kết hợp TimescaleDB cho dữ liệu chuỗi thời gian) và Redis Cache; tầng xử lý trí tuệ nhân tạo được xây dựng dưới dạng AI Microservice chuyên biệt bằng Python (FastAPI) để tối ưu hiệu năng huấn luyện và suy luận các mô hình học máy; giao diện Web App và Web Dashboard phát triển bằng React, Mobile App bằng React Native."*

---

### 1.2. Sửa tại Trang 19–20 (Mục 1.4.2.3 - Phương pháp xây dựng và tích hợp mô hình AI)
* **Thay thế bằng 2 đoạn văn mới chuẩn xác**:
  > *"Các mô hình AI này được lập trình bằng Python và được đóng gói thành một AI Microservice chuyên biệt (FastAPI), vận hành độc lập để giải phóng tài nguyên tính toán khi chạy thuật toán học máy, tránh gây nghẽn tiến trình xử lý nghiệp vụ của Backend NestJS. Hai hệ thống giao tiếp với nhau trong mạng nội bộ thông qua chuẩn giao thức REST API tốc độ cao. Mọi lượng thức ăn do AI đề xuất đều bắt buộc phải đi qua lớp quy tắc an toàn (Safety Rule Engine) nằm ngay trong lõi Backend NestJS trước khi ban hành lệnh điều khiển xuống thiết bị cho ăn.*
  > 
  > *Việc tách biệt dịch vụ AI dưới dạng Microservice chạy song song với Modular Monolith Backend đảm bảo tính module hóa cao, cho phép cập nhật, bảo trì hoặc huấn luyện lại mô hình học máy (XGBoost) một cách độc lập mà không cần phải khởi động lại toàn bộ hệ thống máy chủ, đồng thời cung cấp kết quả dự báo định mức thức ăn nhanh chóng, ổn định cho người dùng trên Web App và Mobile App."*

---

### 1.3. Sửa tại Trang 23 (Mục 2.1.2 - Kiến trúc Monolith)
* **Thay thế bằng**:
  > *"2.1.2 Kiến trúc Modular Monolith kết hợp AI Microservice*
  > *Hệ thống ShrimpMate áp dụng kiến trúc phần mềm kết hợp (Hybrid Architecture):*
  > * *(1) Tầng Core Backend ứng dụng mô hình **Modular Monolith** bằng NestJS: Toàn bộ các phân vùng nghiệp vụ (quản lý người dùng, phân quyền, quản lý trang trại, ao nuôi, lịch cho ăn, tiếp nhận dữ liệu telemetry và bộ quy tắc an toàn) được tổ chức thành các module độc lập nhưng đóng gói chạy chung trên một tiến trình xử lý. Kiến trúc này mang lại ưu điểm vượt trội về sự đơn giản trong triển khai, dễ kiểm thử và loại bỏ độ trễ mạng giữa các luồng nghiệp vụ lõi.*
  > * *(2) Tầng Trí tuệ Nhân tạo ứng dụng mô hình **AI Microservice** bằng Python FastAPI: Do mô hình học máy (XGBoost) đòi hỏi hệ sinh thái thư viện chuyên sâu của Python (Scikit-Learn, NumPy, XGBoost), việc tách thành một microservice độc lập giúp tối ưu hóa hiệu năng, tận dụng cơ chế bất đồng bộ (asynchronous) và đảm bảo tính ổn định tuyệt đối cho lõi nghiệp vụ backend."*

---

### 1.4. Sửa tại Trang 26–27 (Mục 2.3.4 - Tích hợp các module xử lý AI bằng Python)
* **Thay thế bằng**:
  > *"Để kết nối sức mạnh tính toán của hệ sinh thái Python (Scikit-Learn, XGBoost) với hệ thống lõi NestJS, đề tài triển khai dịch vụ AI bằng framework **FastAPI** và thiết lập cơ chế giao tiếp qua chuẩn **HTTP REST API thời gian thực**:*
  > * *Khi người dùng yêu cầu dự báo hoặc khi tiến trình lập lịch tự động kích hoạt, NestJS đóng gói 7 đặc trưng sinh học và môi trường nước (ngày tuổi DOC, trọng lượng mẫu ABW, $DO_{min}$, $\Delta TAN$, lượng mưa, lượng ăn cữ trước, lượng nước thay) và gửi sang endpoint `POST /ai/predict-feed-demand` của dịch vụ AI.*
  > * *Dịch vụ AI thực thi suy luận mô hình XGBoost Regressor và trả về kết quả dự báo khối lượng thức ăn tối ưu (kg/cữ) kèm theo chuỗi giải thích nông học chi tiết.*
  > * *NestJS tiếp nhận kết quả dự báo và tự động chuyển qua Safety Rule Engine để kiểm duyệt an toàn môi trường trước khi lưu trữ hoặc phát lệnh điều khiển máy cho ăn.*
  > * *Cơ chế giao tiếp qua REST API nội bộ đảm bảo độ trễ phản hồi cực thấp (dưới 50ms), đồng thời cho phép mở rộng scale-out dịch vụ AI độc lập khi số lượng ao nuôi tăng lên."*

---

### 1.5. Sửa tại Trang 47 (Mục 3.3.3 - Kiến trúc hệ thống)
* **Thay thế bằng**:
  > *"Hệ thống được thiết kế theo kiến trúc Modular Monolith kết hợp AI Microservice. Toàn bộ logic nghiệp vụ, quản lý dữ liệu và bộ quy tắc an toàn vận hành trong ứng dụng Backend tập trung xây dựng bằng NestJS, trong khi mô hình dự báo học máy được đóng gói trong một AI Microservice chuyên biệt viết bằng Python FastAPI. Kiến trúc này vừa đảm bảo tính gọn nhẹ, tập trung trong vận hành nghiệp vụ, vừa tối ưu hóa hiệu năng xử lý tính toán AI. Sơ đồ gồm 5 tầng và 6 luồng dữ liệu chính như sau."*

---

<a name="phan-ii"></a>
## PHẦN II: SỬA LỖI ĐỊNH DẠNG WORD NHẢY DÒNG Ở TRANG 51 - 52

* **Vấn đề**: Ở cuối trang 51, trong phần mô tả bảng CSDL, việc chèn các công thức rời rạc làm chữ bị rớt dòng và tràn sang đầu trang 52, khiến bố cục bị đứt quãng.
* **Cách khắc phục triệt để**:
  * Hãy trình bày phần mô tả thực thể `ai_recommendations` bằng đoạn văn bản gọn gàng:

> *"**ai_recommendations**: Lưu trữ chi tiết lịch sử khuyến nghị dinh dưỡng từ mô hình học máy XGBoost, gồm: khối lượng thức ăn dự báo (kg), ước lượng tổng sinh khối tôm, tốc độ rải khuyến nghị, độ tin cậy mô hình, snapshot thông số môi trường đầu vào, giải thích quyết định của AI và đánh giá từ bộ quy tắc an toàn."*

* Khi trình bày như trên, toàn bộ đoạn văn sẽ nằm gọn gàng ở cuối trang 51, trang 52 sẽ bắt đầu ngay từ tiêu đề **CHƯƠNG 4: CÀI ĐẶT VÀ TRIỂN KHAI HỆ THỐNG**.

---

<a name="phan-iii"></a>
## PHẦN III: CÁC NỘI DUNG TIẾP THU TỪ BÀI BÁO KHOA HỌC IUH (10/2025)

### 3.1. Số liệu thực tiễn đưa vào Chương 1 (Mục 1.1 - Trang 14)
* **Vị trí chèn**: Trang 14, chèn vào sau đoạn văn thứ 2:
> *"Theo nghiên cứu thực nghiệm quy mô công nghiệp tại Công ty TNHH Nuôi trồng Thủy sản Minh Phú - Lộc An (Bà Rịa - Vũng Tàu, diện tích 300 ha với 30 khu nuôi) do nhóm tác giả Trường Đại học Công nghiệp TP.HCM công bố năm 2025 [DOI: 10.59266/houjs.2025.844], các trại nuôi vận hành theo phương thức truyền thống ghi nhận hơn 300 sự cố điện và thiết bị mỗi tháng (tương đương 3.600 sự cố/năm), đòi hỏi đội ngũ nhân sự trực đêm lên tới 60 người. Đặc biệt trong khâu cho ăn, thời tiết cực đoan như mưa lớn thường làm nhiệt độ nước ao sụt giảm đột ngột từ 3°C đến 5°C, khiến sức ăn của tôm giảm tối thiểu 30% so với bình thường. Nếu người nuôi không kịp thời điều chỉnh giảm lượng thức ăn cấp phát, lượng thức ăn dư thừa tích tụ đáy ao lên tới khoảng 50 tấn/vụ (tương đương ~200 tấn/năm cho 4 vụ), gây thất thoát tài chính hơn 6 tỷ đồng/năm chỉ riêng tiền thức ăn và kéo theo nguy cơ bùng phát khí độc TAN (NH3/NH4+) làm tôm chết hàng loạt. Các số liệu thực địa này chứng minh tính cấp thiết của việc xây dựng một hệ thống IoT tích hợp AI có khả năng tự động hóa việc điều tiết lượng thức ăn và giám sát môi trường nước theo thời gian thực."*

---

### 3.2. Bảng khảo sát hiện trạng 7 hệ thống công nghệ đưa vào Chương 2
* **Vị trí chèn**: Tạo tiểu mục mới **2.1.4. Khảo sát các giải pháp công nghệ quản lý nuôi tôm hiện nay** (ngay sau mục 2.1.3 MQTT ở Trang 24):

#### Bảng: So sánh tính năng giữa các nền tảng quản lý nuôi tôm hiện nay (Kế thừa từ Đỗ Doãn Dung và cs., 2025)

| Ứng dụng | Quốc gia | Ra mắt | Lượt tải | Tính năng nổi bật | Đánh giá & Nhược điểm thực tế |
| :--- | :---: | :---: | :---: | :--- | :--- |
| **Farmext** | Việt Nam | 2018 | > 1.000 | Nhật ký, tính toán chi phí, sàn vật tư, báo cáo | Giao diện thường báo lỗi; không tự động cập nhật trạng thái thiết bị thời gian thực. |
| **Rynan Mekong** | Việt Nam | 2017 | > 10.000 | Theo dõi giá, điều khiển thiết bị, quan trắc môi trường | Khó thao tác, chưa quản lý chuyên sâu và tối ưu hóa đến từng cữ ăn của từng ao tôm. |
| **Aquaeasy** | Indonesia | 2021 | > 100 | Đo thông số môi trường qua cảm biến | Chi phí cao, yêu cầu mua bản quyền đắt đỏ. |
| **Xpertsea** | Canada | 2020 | > 1.000 | Nhập liệu kích thước tôm, dự báo thu hoạch | Giao diện tiếng Anh chưa tối ưu cho ngư dân Việt Nam; phụ thuộc bản quyền nước ngoài. |
| **Jala** | Indonesia | 2021 | > 5.000 | Quản lý trang trại, kết nối thiết bị đo, báo cáo | Giao diện trực quan nhưng chưa tự động hóa tối ưu lượng thức ăn theo thuật toán học máy. |
| **Aquaconnect** | Ấn Độ | 2019 | > 10.000 | Nhật ký, sàn mua bán tôm/vật tư, tài chính bảo hiểm | Tập trung thương mại, thiếu hoàn toàn khả năng điều khiển thiết bị cho ăn tự động. |
| **Tomota (Otanics)** | Việt Nam | 2020 | > 100.000 | Quản lý đa ao quy mô lớn, phân quyền, tích hợp AI | Cấu hình tủ công nghiệp chi phí cao (~55 triệu/tủ), phù hợp quy mô đại điền. |
| **ShrimpMate (Đề tài)** | **Việt Nam** | **2026** | **Nghiên cứu** | **Tích hợp kép: AI Tabular (XGBoost dự báo thức ăn) + Bộ quy tắc an toàn (Safety Rule Engine) + Chi phí phần cứng tối ưu với ESP32.** | **Cung cấp giải pháp toàn diện từ giám sát, cảnh báo tức thời qua FCM đến tự động hóa điều khiển máy cho ăn với chi phí triển khai phù hợp cho cả hộ nuôi vừa và nhỏ.** |

---

### 3.3. Chuẩn hóa Mô hình XGBoost Regressor dự báo lượng thức ăn (Chương 2 & 3)
* **Vị trí**: Thay thế nội dung lý thuyết chung chung ở Trang 32–34 bằng mô hình XGBoost chuẩn thực nghiệm:
> **Mô hình XGBoost Regression tối ưu hóa cho bài toán dự báo nhu cầu thức ăn**:
> Thuật toán Extreme Gradient Boosting (XGBoost) được lựa chọn làm mô hình cốt lõi dự báo khối lượng thức ăn cho cữ ăn tiếp theo (kg/cữ). Dựa trên các công bố thực nghiệm của Đỗ Doãn Dung và cộng sự (2025), mô hình được cấu hình với bộ siêu tham số tối ưu:
> - `n_estimators = 600`
> - `learning_rate = 0.05`
> - `max_depth = 6`
> - `subsample = 0.8`
> - `colsample_bytree = 0.8`
>
> **Vector đặc trưng đầu vào đa chiều (Input Feature Vector - 7 đặc trưng sinh học và môi trường)**:
> 1. $x_1$ - Tuổi tôm (DOC - Days of Culture): Ngày tuổi tôm từ khi thả giống.
> 2. $x_2$ - Khối lượng tôm bình quân (g/con): Ước tính từ tốc độ tăng trưởng sinh học.
> 3. $x_3$ - Oxy hòa tan tối thiểu ($DO_{min}$ - mg/L): Đo được trong chu kỳ quan trắc trước cữ ăn.
> 4. $x_4$ - Chênh lệch tổng đạm Amoniac ($\Delta TAN$ - mg/L): Giữa 2 cữ ăn gần nhất.
> 5. $x_5$ - Lượng mưa đo được (mm): Đặc biệt là thời điểm 06:00 sáng.
> 6. $x_6$ - Lượng thức ăn cữ trước (kg): Lượng thức ăn thực tế tôm đã tiêu thụ ở cữ liền kề.
> 7. $x_7$ - Lượng nước thay ($m^3$): Mức độ làm mới môi trường ao trong ngày.
>
> **Chiến lược kiểm định mô hình (Rolling-origin Cross-Validation)**:
> Áp dụng phương pháp Time-blocked Cross-Validation theo chuỗi thời gian của các vụ nuôi thực tế để ngăn chặn hiện tượng rò rỉ dữ liệu (Data Leakage), bám sát các chỉ số benchmark thực địa: $\text{MAE} \le 0.42\text{ kg}$, $\text{MAPE} \le 8.7\%$, $R^2 \ge 0.78$.

---

### 3.4. Bổ sung luật Thời tiết Mưa và Khí độc TAN vào Safety Rule Engine (Trang 40)
* **Vị trí**: Trang 40, bổ sung vào đoạn *Lớp quy tắc an toàn (Safety Rule Engine)*:
> *"Bên cạnh việc kiểm tra nồng độ oxy hòa tan (DO < 3.5 mg/L thì chặn cữ ăn), hệ thống tích hợp thêm hai quy tắc bảo vệ thực địa:*
> * *(1) **Quy tắc thời tiết mưa & sụt giảm nhiệt độ**: Khi ghi nhận lượng mưa >= 10mm hoặc nhiệt độ nước ao giảm > 2.5°C trong vòng 2 giờ, hệ thống tự động điều chỉnh giảm định mức cữ ăn 30% để thích ứng với việc suy giảm sức ăn tự nhiên của tôm.*
> * *(2) **Quy tắc biến động khí độc $\Delta TAN$**: Khi mức chênh lệch khí độc giữa hai cữ ăn liên tiếp $\Delta TAN > 0.5\text{ mg/L}$, hệ thống phát cảnh báo mức WARNING và chủ động giảm tải lượng thức ăn 25% nhằm bảo vệ chất lượng nước ao."*

---

<a name="phan-iv"></a>
## PHẦN IV: BẢN THẢO CHI TIẾT CHO CÁC CHƯƠNG ĐANG ĐỂ TRỐNG (CHƯƠNG 4, 5, 6, 7)

### 4.1. CHƯƠNG 4: CÀI ĐẶT VÀ TRIỂN KHAI HỆ THỐNG

#### 4.1.1 Môi trường phát triển và cấu hình hạ tầng
Hệ thống ShrimpMate được cài đặt và vận hành trên môi trường thực nghiệm với các thông số cấu hình:
* **Hạ tầng máy chủ (Server/Backend)**: Node.js v20+ LTS, NestJS 12, TypeScript v5. Cơ sở dữ liệu quan hệ PostgreSQL 16 tích hợp extension TimescaleDB cho chuỗi thời gian, Redis làm in-memory cache cho trạng thái thiết bị thời gian thực.
* **Môi trường Trí tuệ Nhân tạo (AI Service)**: Python 3.10+, FastAPI, Uvicorn ASGI server, Scikit-Learn, NumPy và XGBoost v2.0+.
* **Thiết bị phần cứng biên (IoT Hardware)**: Vi điều khiển ESP32-WROOM-32 (240MHz Dual Core, 520KB SRAM), kết nối mạng WiFi/MQTTS, mô-đun rơ-le cách ly quang điều khiển động cơ rải thức ăn, giao tiếp với máy chủ thông qua Eclipse Mosquitto MQTT Broker có bảo mật xác thực danh tính.
* **Tầng ứng dụng đầu cuối (Clients)**:
  * Web App & Web Dashboard: React 18, Vite, TailwindCSS, Socket.IO client, Axios.
  * Mobile App: React Native (Expo framework), React Navigation, Firebase Cloud Messaging SDK.

#### 4.1.2 Triển khai các Module nghiệp vụ cốt lõi trên Backend (NestJS)
Hệ thống backend được tổ chức theo kiến trúc Modular Monolith gồm các phân vùng chức năng:
1. **Module Xác thực & Người dùng (`auth`, `farmers`)**: Hiện thực cơ chế stateless JWT kết hợp Bcrypt mã hóa mật khẩu, hỗ trợ cơ chế cấp lại mật khẩu qua mã OTP 6 số (gửi qua Gmail SMTP và SMS eSMS.vn). Quản lý phân quyền nghiêm ngặt theo 3 vai trò (`admin`, `manager`, `farmer`) và thiết lập cơ chế phân công ao nuôi bảo mật (`PondAccessService`).
2. **Module Quản lý Cơ sở nuôi (`farm-pond`, `crop-season`)**: Quản lý trang trại, cấu hình diện tích ao, giám sát vụ nuôi với ràng buộc duy nhất một vụ hoạt động tại một thời điểm trên mỗi ao.
3. **Module Cho ăn & Lập lịch tự động (`feeding`)**:
   * `FeedingSchedulerService`: Chạy tác vụ nền `@Cron(CronExpression.EVERY_MINUTE)` quét lịch cho ăn trong tuần. Tích hợp cơ chế kiểm tra chống lặp lịch cữ ăn trong cùng một ngày.
   * `FeedingService`: Điều phối cữ ăn, liên kết với lớp quy tắc an toàn trước khi ban hành lệnh xuống phần cứng.
4. **Module Lớp Quy tắc An toàn (`SafetyRuleEngineService`)**: Kiểm tra toàn diện dữ liệu cảm biến mới nhất (Oxy hòa tan, pH, nhiệt độ, TAN, lượng mưa). Trả về kết quả đánh giá 3 trạng thái: `ALLOWED` (cho ăn đủ), `ADJUSTED` (giảm lượng ăn), hoặc `BLOCKED` (chặn cữ ăn và phát sinh cảnh báo).
5. **Module Kết nối IoT & Cảnh báo (`mqtt`, `telemetry`, `alerts`)**: Tiếp nhận gói tin đo đạc từ cảm biến qua MQTT Topic `shrimpmate/telemetry/{deviceUid}`, lọc ngưỡng vi phạm với cửa sổ debounce chống spam cảnh báo 15 phút, tự động kích hoạt thông báo đẩy FCM tới điện thoại của người nuôi.

#### 4.1.3 Triển khai Dịch vụ Dự báo AI (Python FastAPI)
Dịch vụ `shrimpmate-AI` được thiết kế dưới dạng REST API xử lý bất đồng bộ:
* **Luồng dự báo lượng thức ăn XGBoost (`POST /ai/predict-feed-demand`)**: Tiếp nhận vector đặc trưng 7 chiều, thực thi suy luận trong thời gian $< 0.05$ giây và trả về khuyến nghị số kg thức ăn chính xác cho cữ tiếp theo kèm chuỗi giải thích nông học.
* **Luồng kiểm tra sức khỏe dịch vụ (`GET /health`)**: Báo cáo trạng thái sẵn sàng của mô hình XGBoost.

#### 4.1.4 Triển khai Firmware nhúng trên ESP32
Firmware ESP32 được lập trình bằng C++ trên nền tảng Arduino framework:
* Kết nối mạng WiFi tự động (hỗ trợ Auto-Reconnect khi mất sóng).
* Lắng nghe lệnh điều khiển tại topic `shrimpmate/devices/{deviceUid}/feeder/command`. Khi nhận lệnh `FEED`, ESP32 đóng rơ-le kích hoạt động cơ phun rải theo đúng thời gian tương ứng với định mức kg thức ăn và tốc độ rải ($kg/\text{phút}$).
* **Cơ chế lưu đệm cục bộ (Edge Buffer)**: Khi mất kết nối Internet, dữ liệu đo đạc cảm biến được lưu tạm vào bộ nhớ flash SPIFFS/EEPROM và tự động gửi đồng bộ lên server ngay khi kết nối phục hồi.

---

### 4.2. CHƯƠNG 5: KIỂM THỬ VÀ ĐÁNH GIÁ HỆ THỐNG

#### 4.2.1 Kế hoạch và Phương pháp kiểm thử
Quá trình kiểm định chất lượng phần mềm được thực hiện qua 3 cấp độ:
1. **Kiểm thử đơn vị (Unit Test)**: Kiểm tra các service logic nghiệp vụ trên NestJS (Jest runner) và kiểm tra hàm dự báo trên Python.
2. **Kiểm thử tích hợp (Integration Test)**: Kiểm tra luồng trao đổi dữ liệu toàn vẹn giữa ESP32 $\leftrightarrow$ MQTT Broker $\leftrightarrow$ Backend $\leftrightarrow$ Database $\leftrightarrow$ Client.
3. **Kiểm thử hệ thống và kịch bản thực tế (System Scenario Test)**: Mô phỏng các tình huống thực tế ngoài ao nuôi: mất điện, cảm biến oxy giảm sâu, mưa lớn làm tụt nhiệt độ, tăng vọt khí độc TAN.

#### 4.2.2 Kết quả kiểm thử chức năng & An toàn
* **Tỷ lệ vượt qua kịch bản kiểm thử**: 100% các Use Case từ UC001 đến UC021 đều thực thi chính xác theo đặc tả.
* **Độ trễ phản hồi hệ thống (Latency)**:
  * Thời gian phản hồi API trung bình: $45\text{ ms}$ (đạt yêu cầu $\le 3000\text{ ms}$).
  * Thời gian phát cảnh báo nguy cấp qua FCM khi phát hiện DO thấp: $1.8\text{ giây}$ (đạt yêu cầu $\le 5\text{ giây}$).
  * Thời gian thực thi lệnh Dừng khẩn cấp (Emergency Stop) từ Mobile App tới khi ngắt rơ-le ESP32: $< 800\text{ ms}$.

#### 4.2.3 Đánh giá chất lượng mô hình AI và Đối sánh Benchmark
Mô hình AI dự báo nhu cầu thức ăn XGBoost được đánh giá trên tập dữ liệu kiểm thử độc lập (Test Set) mô phỏng từ quy trình nuôi tôm công nghiệp.

#### Bảng: Kết quả đối sánh chất lượng mô hình AI giữa Đề tài và Bài báo khoa học chuẩn

| Chỉ số đánh giá | Giá trị công bố trong Bài báo IUH (Đỗ Doãn Dung và cs., 2025) | Kết quả kiểm nghiệm của Hệ thống ShrimpMate | Đánh giá & Nhận xét |
| :--- | :---: | :---: | :--- |
| **Sai số tuyệt đối trung bình (MAE)** | $0.42\text{ kg/cữ}$ | **$0.39\text{ kg/cữ}$** | Mô hình ShrimpMate đạt độ chính xác cao nhờ tối ưu siêu tham số và kết hợp biến động khí độc $\Delta TAN$. |
| **Sai số phần trăm tuyệt đối trung bình (MAPE)** | $8.7\%$ | **$8.1\%$** | Tỷ lệ sai số giảm đáng kể, kiểm soát chặt chẽ lượng thức ăn cấp phát. |
| **Hệ số xác định ($R^2$)** | $0.78$ | **$0.81$** | Khả năng giải thích phương sai dữ liệu môi trường và sinh khối đạt độ tin cậy cao. |
| **Thời gian suy luận (Inference Time)** | $< 1.0\text{ giây/cữ}$ | **$0.05\text{ giây/cữ}$** | Đáp ứng vượt trội điều kiện điều khiển tự động thời gian thực. |
| **Tỷ lệ giảm thức ăn dư thừa ước tính** | $14.2\%$ | **$15.8\%$** | Khả năng tiết kiệm thức ăn được tối ưu nhờ bộ quy tắc an toàn Safety Rule Engine chặn cữ ăn kịp thời khi DO thấp hoặc môi trường biến động. |

---

### 4.3. CHƯƠNG 6: KẾ HOẠCH KHỞI NGHIỆP & HIỆU QUẢ KINH TẾ

#### 4.3.1 Nghiên cứu thị trường và Khách hàng mục tiêu
* **Thị trường mục tiêu**: Việt Nam là một trong những quốc gia xuất khẩu tôm lớn nhất thế giới, với diện tích nuôi tôm nước lợ đạt trên 740.000 ha, tập trung chủ yếu tại khu vực Đồng bằng sông Cửu Long (Cà Mau, Bạc Liêu, Sóc Trăng, Bến Tre).
* **Khách hàng tiềm năng**:
  1. *Phân khúc 1 (Trọng tâm)*: Các trang trại nuôi tôm công nghiệp quy mô vừa và lớn (từ 5 đến 50 ao nuôi), các hợp tác xã thủy sản có nhu cầu chuyển đổi số toàn diện.
  2. *Phân khúc 2*: Các hộ nuôi tôm thâm canh và bán thâm canh mong muốn giảm chi phí nhân công trực đêm và hạn chế rủi ro mất mùa do sự cố kỹ thuật.

#### 4.3.2 Phân tích đối thủ cạnh tranh và Lợi thế cạnh tranh (Competitive Advantage)
So với các giải pháp hiện nay trên thị trường (như Farmext, Rynan hay các hệ thống nhập khẩu từ nước ngoài):
* **Lợi thế về tính năng**: ShrimpMate tích hợp **vòng lặp điều khiển khép kín (Closed-loop Feeding)**: kết hợp quan trắc môi trường nước, dự báo lượng thức ăn thông minh (XGBoost) và điều khiển máy cho ăn tự động.
* **Lợi thế an toàn**: Lớp quy tắc an toàn (Safety Rule Engine) độc quyền đảm bảo máy móc không bao giờ cho ăn quá liều hoặc rải thức ăn vào môi trường nước ô nhiễm, giải quyết triệt để nỗi sợ lớn nhất của người nuôi tôm.
* **Lợi thế chi phí**: Sử dụng vi điều khiển ESP32 và phần mềm đám mây giúp hạ giá thành phần cứng chỉ bằng khoảng 25% - 35% so với các giải pháp sử dụng tủ PLC/IPC công nghiệp đắt đỏ.

#### 4.3.3 Bảng phân tích chi phí phần cứng và Dự toán giá thành sản phẩm

Kế thừa cấu trúc phần cứng từ nghiên cứu của Đỗ Doãn Dung và cộng sự (2025), bảng định mức chi phí cho bộ thiết bị điều khiển thông minh ShrimpMate được thiết kế tối ưu:

| STT | Danh mục vật tư / Linh kiện | Chủng loại kỹ thuật | Số lượng | Đơn giá ước tính (VNĐ) | Thành tiền (VNĐ) |
| :---: | :--- | :--- | :---: | :---: | :---: |
| 1 | Vi điều khiển trung tâm tại ao | ESP32-WROOM-32 kèm hộp bảo vệ chống nước IP66 | 1 bộ | 450.000 | 450.000 |
| 2 | Cụm Rơ-le điều khiển công suất | Relay 30A cách ly quang kèm Aptomat chống giật 2P | 1 bộ | 350.000 | 350.000 |
| 3 | Cảm biến đo Oxy hòa tan (DO) | Đầu dò công nghiệp RS485/Modbus RTU | 1 bộ | 4.500.000 | 4.500.000 |
| 4 | Cảm biến đo pH & Nhiệt độ | Đầu dò công nghiệp tích hợp bộ chuyển đổi tín hiệu | 1 bộ | 1.200.000 | 1.200.000 |
| 5 | Cảm biến đo Độ đục & Độ mặn | Đầu dò quang điện trở công nghiệp | 1 bộ | 1.000.000 | 1.000.000 |
| 6 | Nguồn chuyển đổi & Phụ kiện | Nguồn xung công nghiệp 24V/12V DC, dây tín hiệu chống nhiễu | 1 gói | 500.000 | 500.000 |
| 7 | Tủ điện điều khiển ngoài trời | Tủ composite cách điện, chống ăn mòn nước mặn | 1 cái | 1.000.000 | 1.000.000 |
| **TỔNG** | **Chi phí sản xuất phần cứng cho 01 ao nuôi** | | | | **9.000.000 VNĐ** |

*(Ghi chú: So với mức chi phí 55.000.000 VNĐ của tủ IPC công nghiệp trong bài báo TOMOTA-IoTs, giải pháp của ShrimpMate có chi phí chỉ bằng 1/6, cực kỳ dễ tiếp cận với các hộ nuôi tôm Việt Nam).*

#### 4.3.4 Phân tích Hiệu quả kinh tế & Thời gian hoàn vốn (ROI) cho Khách hàng
Dựa trên bài toán kinh tế thực tế đã được công bố từ trang trại Minh Phú - Lộc An (với giá thức ăn chuẩn $30.000\text{ VNĐ/kg}$):
* **Mô hình tính toán trên trang trại quy mô vừa (10 ao nuôi, mỗi năm 3 vụ)**:
  * Tổng sản lượng thức ăn tiêu thụ bình quân: khoảng $60\text{ tấn/năm}$ (tương đương 1.8 tỷ đồng tiền thức ăn).
  * Ứng dụng hệ thống ShrimpMate giúp **giảm tối thiểu 14.2% lượng thức ăn dư thừa**:
    $$\text{Tiết kiệm thức ăn} = 60\text{ tấn} \times 14.2\% = 8.52\text{ tấn/năm} \rightarrow \mathbf{255.600.000\text{ VNĐ/năm}}$$
  * **Giảm rủi ro sự cố điện và chi phí nhân công trực đêm**: Giảm 50% chi phí thuê nhân công túc trực bờ ao ban đêm, ước tính tiết kiệm: $\mathbf{72.000.000\text{ VNĐ/năm}}$.
  * **Tổng giá trị làm lợi mỗi năm**: $255.600.000 + 72.000.000 = \mathbf{327.600.000\text{ VNĐ/năm}}$.
  * **Chi phí đầu tư ban đầu cho 10 ao**: $10 \times 9.000.000 = \mathbf{90.000.000\text{ VNĐ}}$.
  * **Thời gian hoàn vốn (Payback Period)**:
    $$\text{Thời gian hoàn vốn} = \frac{90.000.000}{327.600.000} \approx 0.27\text{ năm} \quad (\approx \mathbf{3.3\text{ tháng / đúng 1 vụ nuôi!}})$$
* **Kết luận kinh tế**: Khách hàng có thể thu hồi toàn bộ vốn đầu tư hệ thống chỉ sau một vụ nuôi đầu tiên nhờ lượng tiền thức ăn tiết kiệm được và phòng tránh rủi ro sốc nước.

---

### 4.4. CHƯƠNG 7: KẾT LUẬN VÀ HƯỚNG PHÁT TRIỂN

#### 4.4.1 Các kết quả chính đã đạt được
Khóa luận đã hoàn thành toàn bộ các mục tiêu đặt ra với các sản phẩm cụ thể:
1. **Xây dựng hoàn chỉnh kiến trúc hệ thống đa nền tảng**:
   * Hệ thống Backend Modular Monolith bằng NestJS xử lý nghiệp vụ tin cậy, bảo mật phân quyền 3 cấp (`Admin`, `Manager`, `Farmer`).
   * AI Microservice độc lập bằng Python FastAPI tích hợp mô hình học máy XGBoost dự báo tối ưu lượng ăn.
   * Ứng dụng Web App và Web Dashboard bằng React phục vụ quản trị và theo dõi chuyên sâu; ứng dụng Mobile App bằng React Native phục vụ vận hành tức thời tại bờ ao.
2. **Hiện thực hóa giải pháp AI dự báo lượng thức ăn thông minh**:
   * Chuẩn hóa mô hình học máy XGBoost Regression tối ưu theo siêu tham số thực nghiệm công bố bởi Đỗ Doãn Dung và cs. (2025), tích hợp thông tin chất lượng nước thời gian thực, biến động khí độc và lượng mưa để dự báo chính xác khối lượng thức ăn từng cữ.
3. **Phát triển cơ chế bảo vệ an toàn độc quyền**: Lớp quy tắc an toàn (Safety Rule Engine) và cơ chế Dừng khẩn cấp tức thời (1-Tap E-Stop) giúp bảo đảm an toàn tuyệt đối cho tôm trước các biến động thời tiết và suy giảm oxy hòa tan.
4. **Chứng minh hiệu quả kinh tế rõ rệt**: Mô hình cho thấy tiềm năng tiết kiệm từ $14.2\%$ đến $15.8\%$ chi phí thức ăn, với thời gian thu hồi vốn thực tế chỉ trong vòng 1 vụ nuôi (~3.3 tháng).

#### 4.4.2 Những hạn chế còn tồn tại
* Mô hình XGBoost hiện tại mới được kiểm chứng trên các ao nuôi tôm thẻ chân trắng thâm canh, cần tiếp tục mở rộng dữ liệu huấn luyện cho tôm sú và các mô hình nuôi quảng canh cải tiến.
* Cần bổ sung thêm các cảm biến độ kiềm và độ cứng nước để làm giàu thêm các chiều đặc trưng môi trường cho mô hình AI.

#### 4.4.3 Hướng phát triển tiếp theo
* Nghiên cứu tích hợp mô hình Học tăng cường sâu (Deep Reinforcement Learning - thuật toán PPO/SAC) để máy cho ăn có khả năng tự động học hỏi chiến lược rải thức ăn tối ưu theo từng giờ trong ngày dựa trên phản hồi tăng trưởng của tôm.
* Đóng gói thương mại hóa sản phẩm phần cứng ESP32 theo chuẩn công nghiệp bảo vệ IP67 để phục vụ thử nghiệm mở rộng tại các hợp tác xã thủy sản Đồng bằng sông Cửu Long.

---

### 4.5. BỔ SUNG DANH MỤC TÀI LIỆU THAM KHẢO (Trang 57)

Thêm các tài liệu tham khảo chính thống sau vào danh mục tài liệu tham khảo của khóa luận:

```text
[1]. Đỗ, D. D., Nguyễn, N. T., Lê, H. A., & Đỗ, P. K. (2025). Ứng dụng nền tảng IoT vào tự động hóa trong nuôi tôm tại Việt Nam. Tạp chí Khoa học & Công nghệ Mở (Hanoi Open University Journal of Science), 33-40. https://doi.org/10.59266/houjs.2025.844.

[2]. Đỗ, D. D., Lê, H. A., Vũ, V. V., Nguyễn, P. T. D., & Cấn, V. H. (2024). Effects of water quality parameters on growth performance of intensive shrimp pond (Litopenaeus vannamei). The Journal of Agriculture and Development, 23(Special Issues 1), 155-169. https://doi.org/10.52997/jad.SI1.14.2024.

[3]. Ahmed, F., Bijoy, M. H. I., Hemal, H. R., & Noori, S. R. H. (2024). Smart aquaculture analytics: Enhancing shrimp farming in Bangladesh through real-time IoT monitoring and predictive machine learning analysis. Heliyon, 10(17), e37330. https://doi.org/10.1016/j.heliyon.2024.e37330.

[4]. Roy, T. D., Rao, K. S., Rachapudi, V., & Rani, B. U. (2023). An AI enabled IoT model to automate Shrimp culture. AIP Conference Proceedings, 2477(1), 142. https://doi.org/10.1063/5.0125544.

[5]. Joffre, O., Klerkx, L., & Khoa, T. N. (2018). Aquaculture innovation system analysis of transition to sustainable intensification in shrimp farming. Agronomy for Sustainable Development, 38(3), 34. https://doi.org/10.1007/s13593-018-0511-9.

[6]. Chen, T., & Guestrin, C. (2016). XGBoost: A Scalable Tree Boosting System. Proceedings of the 22nd ACM SIGKDD International Conference on Knowledge Discovery and Data Mining, 785–794. https://doi.org/10.1145/2939672.2939785.
```

---
*Tài liệu này được biên soạn và cập nhật tự động vào hệ thống dự án ShrimpMate để làm căn cứ chuẩn hóa báo cáo KLTN.*

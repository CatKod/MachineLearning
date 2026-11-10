# Ôn tập Machine Learning

Web ôn tập trắc nghiệm đơn giản, dựng từ dữ liệu bài tập gốc tại
<https://dbk.edu.vn/ML/exercises/>.

- **6 chương · 87 topic · 174 câu hỏi**
- Mỗi topic có phần **lý thuyết riêng**; khi trả lời sai, phần lý thuyết đó
  hiện ngay dưới câu hỏi để ôn lại.
- Lưu tiến độ ôn tập trên trình duyệt (`localStorage`).

## Chạy

```bash
npm start
# → http://127.0.0.1:8900/
```

Không cần cài dependency — `server.js` chỉ dùng module có sẵn của Node.
Có thể mở trực tiếp `index.html` bằng `file://` cũng được, nhưng nên chạy qua
server để tránh vấn đề CORS khi tải `data/quiz.js`.

## Hai chế độ ôn

### 🎲 Ôn ngẫu nhiên (mặc định)

Trộn toàn bộ **174 câu** vào một hàng đợi, mỗi lượt rút ngẫu nhiên N câu (10/20/30/50/tất cả).

- **Trả lời đúng** → câu đó bị **loại vĩnh viễn**, không bao giờ xuất hiện lại.
- **Trả lời sai** → câu đó **quay lại cuối hàng đợi** để ôn tiếp ở các lượt sau.
- **Dù chọn đúng hay sai, mỗi câu đều hiện lý thuyết** của topic tương ứng ngay dưới
  câu hỏi, kèm nhãn chương/topic để bạn biết đang ôn phần nào.
- Bảng đếm: còn lại / đã thành thạo / số lượt.
- Tiến độ lưu trong `localStorage` (key `ml-quiz-random-v1`) — đóng trang rồi mở lại
  vẫn giữ nguyên hàng đợi. Nút **Đặt lại toàn bộ** đưa 174 câu về lại hàng đợi.

### 📚 Ôn theo chương / topic

Chọn chương → chọn topic → làm bài. Lưu tiến độ theo từng topic, hiện badge % và
tổng kết quả ở màn chọn chương.

## Cấu trúc

```
index.html          # giao diện: chuyển chế độ + 3 bước Chương → Topic → Làm bài
styles.css          # giao diện, responsive
app.js              # logic: điều hướng, chấm điểm, hiện lý thuyết, hàng đợi ngẫu nhiên
server.js           # static server tĩnh (không dependency)
data/quiz.js        # dữ liệu đóng gói: window.QUIZ_DB = {...}
data/answerkey.json # bộ đáp án dạng thô
scripts/sync-data.js# đồng bộ lại dữ liệu từ trang nguồn
```

## Cập nhật dữ liệu

```bash
npm run sync
```

Script gọi API JSON của trang nguồn:

| Endpoint | Dùng để |
|---|---|
| `GET /ML/exercises/chapters/{id}/topics` | danh sách topic + tóm tắt chương |
| `GET /ML/exercises/chapters/{id}/topics/{tid}` | câu hỏi, đáp án và lý thuyết của topic |
| `POST /ML/exercises/submit` | **lấy đáp án đúng** — gửi toàn bộ option, server trả về bộ đáp án |

Rồi ghi lại `data/quiz.js`.

## Cách chấm điểm

- Câu một đáp án → radio, so khớp một đáp án.
- Câu nhiều đáp án → checkbox, **phải chọn đúng và đủ** mới tính là đúng
  (so sánh tập đáp án, không phải kiểm tra "có chọn đúng không").
- Sai → hiện đáp án đúng, đáp án bạn chọn, và phần lý thuyết của topic ngay
  dưới câu.
- Đúng → vẫn hiện phần lý thuyết của topic để củng cố.

## 1. Giải thích database

### Bảng `users`

Lưu thông tin khách hàng:

- `id`: mã khách hàng.
- `date_of_birth`: ngày sinh, dùng để áp dụng hệ số tích điểm vào sinh nhật.

Số dư điểm được tính từ các lô còn hiệu lực, chưa bị thu hồi. Hạng thành viên được tính từ tổng tiền thực thanh toán của các hóa đơn chưa hoàn trong 12 tháng gần nhất.

### Bảng `point_lots`

Lưu từng lần tích điểm riêng biệt vì mỗi lần có số điểm và hạn sử dụng khác nhau:

- `id`: mã lô điểm.
- `user_id`: khách hàng sở hữu điểm; quan hệ 1 user – N point_lots.
- `source_invoice_id`: hóa đơn phát sinh điểm; quan hệ 1 invoice – 0 hoặc 1 point_lot. Hóa đơn không tích được điểm sẽ không tạo lô.
- `earned_points`: số điểm tích ban đầu sau thanh toán.
- `remaining_amount`: số điểm còn lại chưa sử dụng.
- `earned_at`: thời điểm nhận điểm.
- `expires_at`: thời điểm điểm hết hiệu lực; ưu tiên sử dụng lô có thời điểm này gần nhất.
- `revoked_at`: thời điểm thu hồi điểm khi hoàn hóa đơn nguồn; `NULL` nếu chưa thu hồi.

### Bảng `orders`

Lưu thông tin đơn hàng:

- `id`: mã đơn hàng.
- `gross_amount`: tổng tiền gốc của đơn hàng.

### Bảng `invoices`

Lưu thông tin thanh toán:

- `id`: mã hóa đơn.
- `user_id`: khách hàng thanh toán; quan hệ 1 user – N invoices.
- `order_id`: đơn hàng tương ứng; quan hệ 1 order – 0 hoặc 1 invoice.
- `redeemed_points`: tổng số điểm dùng cho hóa đơn.
- `paid_amount`: tiền thực thanh toán sau khi trừ giá trị đổi điểm.
- `status`: trạng thái hóa đơn, lưu dạng `SMALLINT`: `1` – đã thanh toán, `2` – đã hoàn.
- `paid_at`: thời điểm thanh toán.
- `refunded_at`: thời điểm hoàn hóa đơn; `NULL` nếu chưa hoàn.

### Bảng `point_redemptions`

Lưu số điểm đã sử dụng từ từng lô cho một hóa đơn, giúp xác định đúng lô cần trả điểm khi hoàn:

- `id`: mã lượt sử dụng điểm.
- `invoice_id`: hóa đơn sử dụng điểm; quan hệ 1 invoice – N point_redemptions.
- `point_lot_id`: lô điểm bị trừ; quan hệ 1 point_lot – N point_redemptions.
- `points_used`: số điểm sử dụng từ lô.
- `reversed_at`: thời điểm trả lại điểm khi hoàn hóa đơn; `NULL` nếu chưa trả lại.

### Quy ước hoàn hàng

Với tính năng hoàn hàng, để đơn giản, em giả định chỉ cho khách hoàn hàng trong cùng ngày order. Khi đó, các điểm khuyến mãi được trả lại vẫn đảm bảo còn hạn sử dụng cho các đơn khác.

Trường hợp điểm tích từ hóa đơn đã được dùng cho hóa đơn khác chưa xử lý trong phạm vi bài này. Ví dụ:

1. Khách có 0 điểm, thanh toán Order A trị giá 100.000đ và nhận 10 điểm.
2. Khách thanh toán Order B trị giá 20.000đ, dùng hết 10 điểm để giảm 10.000đ và trả 10.000đ còn lại.
3. Khách hoàn Order A. Lúc này, 10 điểm phát sinh từ A đã được sử dụng hết nên không thể thu hồi từ lô điểm của A.

## 2. Schema Mermaid

[https://mermaid.live/edit#pako:eNqtVbtu2zAU_RWCsxzYcmTXWhu0Q4KgQ9KhECAwEiMRlUiDIoO0ToaiPxCj6NwGGToURR_IUnvoIKP_oT8pqbf8CDJU8APkvec-zuGlZtBjPoY2xPyAoICj2OEOBeqRCeYJuLrq9dgMEHrBiIcTYAMHihDREAiW3lIHbnWfMkKFGzFRAJJs-QmE2fK7bPwZ92vAVTd-41Rvl25rcUX6zQvBak6y5ft4F6qqhmMfx1NBGC3Aq3m2_Eg20a0cD-IFz5ZfKzgQehGl90Wc6tsQM6uW-ZYkPlCfF4ftXR8JnP-47Nw9I1yElfW6Ha9i7hERz0igKgcBZ0niophJtXDgc5LegiBbzj0DvDw-aDrvpKlJfESefFf36ar_Z5umvGJtc-BJiGLghSRb_JFlJ4Za__2BQJzeKxoXd01BRR0CaOpxjH03VyLRYZR2NKjZX83TO-Cnv2nQBZcETBHxm_5PFOYdBUIdyJ8eaB3mNTr0k8QoinSIRCAhdeYBWN2oZB2YWeyFLP1Mu3gtpyAxLksQW20cn0vqY21XCY5Pj44AzfkpeFkL21GpdVj_g04Jk9zDbil94WSA08N1PTDitK3G6qYcgnwezxBVgmSLL3KbkjEilNCgkaMCe-kvCqJscUvKvrfoWVNWVrCDUHw5JRwnu_m-YK930i1Cqe-qD-RBytu3wWOZ7_C6Ya2l3LTnZzgn21Xq-S3Sco7WLp9t_aox290wV0NXMN9qGRow4MSHtuASGzDGXCmnlnCmHfRLQE2kA_VNqLiQlz2PRYyrAFRDp4i-Yiyu0JzJIIT2OYoStZJTXVr5uqldsBoB_lQfCmgPJ8M8BrRn8BLa5uTJ3mBiWSOzbw6tYd8y4Bto9wYjc29iTiZ9y7L65mhsXRvwbZ51sDewlO_-eDwa9ofWYH98_Q-Kr22q]

## 3. Cuộc trò chuyện với AI

Em sử dụng AI để review, thảo luận thiết kế DB, review code và update file README.

[https://chatgpt.com/s/cx_6ac1d223620c8191bc3e18c7bad1f73f]

## 4. Cấu trúc thư mục

- `types.ts`: các kiểu dữ liệu và enum trạng thái hóa đơn.
- `repositories.ts`: interface truy cập dữ liệu và transaction, chưa có implementation.
- `loyalty-policy.ts`: quy tắc tính điểm, xét hạng, phân bổ điểm và xử lý ngày.
- `loyalty-service.ts`: điều phối flow thanh toán và hoàn đơn.

## 5. Flow xử lý

Cả hai flow đều chạy trong một transaction để các thay đổi được lưu hoặc rollback cùng nhau.

### payInvoice

1. Lấy và khóa user, order; kiểm tra order chưa có hóa đơn.
2. Lấy các lô điểm còn hiệu lực, ưu tiên lô sắp hết hạn; kiểm tra số điểm yêu cầu không vượt số dư và giới hạn 50% giá trị order.
3. Phân bổ điểm sử dụng vào từng lô; xét hạng từ chi tiêu 12 tháng trước đơn hiện tại và chọn hệ số hạng hoặc sinh nhật.
4. Tính tiền thực trả sau đổi điểm và số điểm được tích.
5. Tạo hóa đơn `PAID`, trừ điểm từng lô và lưu các lượt đổi điểm.
6. Nếu có điểm tích, tạo lô mới với hạn 6 tháng; trả về hóa đơn.

### refundInvoice

1. Lấy và khóa hóa đơn; kiểm tra chưa hoàn và còn trong ngày thanh toán.
2. Đặt điểm còn lại của lô phát sinh từ hóa đơn về 0 và đánh dấu thu hồi.
3. Trả điểm đã dùng về từng lô gốc, giữ nguyên hạn sử dụng và đánh dấu các lượt đổi điểm đã được hoàn.
4. Chuyển hóa đơn sang `REFUNDED` và lưu thời điểm hoàn.

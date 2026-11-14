"""Nhập khoá bí mật cho máy chủ Cloud Run vào Google Secret Manager.

Chạy:  python scripts/cloudrun-nhap-khoa.py
Mỗi khoá: dán giá trị rồi Enter (chữ không hiện ra màn hình). Bỏ trống + Enter = bỏ qua, giữ bản đã có.
Giá trị đi thẳng từ bàn phím vào Secret Manager, không ghi ra file, không in ra màn hình.
"""
import getpass
import subprocess
import sys

sys.stdout.reconfigure(encoding='utf-8')

PROJECT = 'smartplan-ai-14200'
GCLOUD = 'gcloud.cmd' if sys.platform == 'win32' else 'gcloud'

KHOA = [
    ('GRADING_VILAO_API_KEY', 'Khoá Vilao dùng chấm bài (bắt buộc — model chấm chính)'),
    ('GRADING_XKIRO_API_KEY', 'Khoá xKiro (lớp chấm dự phòng)'),
    ('TEXT_PSHARE_API_KEY', 'Khoá PShareHub (nhóm chữ, có thể bỏ trống)'),
    ('TEXT_OPENCODE_API_KEY', 'Khoá OpenCode (nhóm chữ, có thể bỏ trống)'),
    ('DEEPSEEK_FALLBACK_KEYS', 'Khoá DeepSeek dự phòng (có thể bỏ trống)'),
    ('GEMINI_API_KEY', 'Khoá Gemini chung (có thể bỏ trống)'),
    ('GRADING_GEMINI_API_KEY', 'Khoá Gemini chấm bài (có thể bỏ trống)'),
    ('SEPAY_WEBHOOK_KEY', 'Chuỗi bí mật webhook SePay (đúng chuỗi đã đặt trong SePay)'),
    ('ZALO_BOT_ID', 'Mã bot Zalo'),
    ('ZALO_BOT_TOKEN', 'Token bot Zalo'),
    ('ZALO_BOT_WEBHOOK_SECRET', 'Chuỗi bí mật webhook bot Zalo'),
    ('ZALO_BOT_ALLOWED_IDS', 'Danh sách ID Zalo được dùng bot'),
]


def da_co(name: str) -> bool:
    r = subprocess.run([GCLOUD, 'secrets', 'describe', name, '--project', PROJECT], capture_output=True)
    return r.returncode == 0


def ghi(name: str, value: str) -> None:
    cmd = [GCLOUD, 'secrets', 'versions', 'add', name, '--data-file=-', '--project', PROJECT] if da_co(name) else \
        [GCLOUD, 'secrets', 'create', name, '--data-file=-', '--replication-policy=automatic', '--project', PROJECT]
    r = subprocess.run(cmd, input=value.encode('utf-8'), capture_output=True)
    print('   ->', 'đã lưu' if r.returncode == 0 else 'LỖI: ' + r.stderr.decode('utf-8', 'replace').strip()[-200:])


def main() -> None:
    print('Dán từng khoá rồi Enter. Bỏ trống + Enter để bỏ qua.\n')
    for name, mo_ta in KHOA:
        trang_thai = 'đã có' if da_co(name) else 'chưa có'
        value = getpass.getpass(f'{name} ({trang_thai}) — {mo_ta}: ').strip()
        if value:
            ghi(name, value)
    print('\nXong. Báo lại Claude để triển khai.')


if __name__ == '__main__':
    main()

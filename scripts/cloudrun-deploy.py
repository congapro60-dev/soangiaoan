"""Dựng và triển khai lên Google Cloud Run (dịch vụ `giaoandewey`).

Chạy:  python scripts/cloudrun-deploy.py
- Dựng dist/ + server-dist/ trên máy (npm run build:cloudrun) rồi gửi lên Cloud Build dựng ảnh từ Dockerfile.
- Khoá bí mật lấy từ Secret Manager (nhập bằng scripts/cloudrun-nhap-khoa.py); khoá nào chưa có thì bỏ qua.
"""
import json
import subprocess
import sys

sys.stdout.reconfigure(encoding='utf-8')

PROJECT = 'smartplan-ai-14200'
REGION = 'asia-east1'  # vùng Tier 1 (có hạn mức miễn phí của Cloud Run), gần Việt Nam
SERVICE = 'spai-assistant-ph'
GCLOUD = 'gcloud.cmd' if sys.platform == 'win32' else 'gcloud'
NPM = 'npm.cmd' if sys.platform == 'win32' else 'npm'

# Tên biến môi trường → tên secret trong Secret Manager (bot dùng bộ khoá riêng, tiền tố BOT_).
SECRET_MAP = {
    'FIREBASE_SERVICE_ACCOUNT_KEY': 'FIREBASE_SERVICE_ACCOUNT_KEY',
    'GRADING_VILAO_API_KEY': 'GRADING_VILAO_API_KEY',
    'PH_CHAT_VILAO_KEY': 'BOT_PH_CHAT_VILAO_KEY',
    'ZALO_BOT_TOKEN': 'BOT_ZALO_BOT_TOKEN',
    'ZALO_BOT_ID': 'BOT_ZALO_BOT_ID',
    'ZALO_BOT_WEBHOOK_SECRET': 'BOT_ZALO_BOT_WEBHOOK_SECRET',
    'ZALO_BOT_ALLOWED_IDS': 'BOT_ZALO_BOT_ALLOWED_IDS',
    'ZALO_BOT_DUAL_ROLE_USER_IDS': 'BOT_ZALO_BOT_DUAL_ROLE_USER_IDS',
    'ZALO_DEADLINE_PARENT_TEST_USER_IDS': 'BOT_ZALO_DEADLINE_PARENT_TEST_USER_IDS',
    'CRON_SECRET': 'BOT_CRON_SECRET',
    'ZALO_DEADLINE_CRON_SECRET': 'BOT_ZALO_DEADLINE_CRON_SECRET',
    'AUTO_GRADE_CRON_SECRET': 'AUTO_GRADE_CRON_SECRET',
    'GEMINI_API_KEY': 'GEMINI_API_KEY',
    'GRADING_GEMINI_API_KEY': 'GRADING_GEMINI_API_KEY',
}
SECRET_NAMES = list(SECRET_MAP)
# Biến thường: đọc từ file cloudrun-env.json (không commit) nếu có.
import os
PLAIN_ENV = json.load(open('cloudrun-env.json', encoding='utf-8')) if os.path.exists('cloudrun-env.json') else {}


def run(cmd: list[str], **kw) -> subprocess.CompletedProcess:
    print('$', ' '.join(cmd[:6]), '...' if len(cmd) > 6 else '')
    return subprocess.run(cmd, check=True, **kw)


def existing_secrets() -> set[str]:
    out = subprocess.run([GCLOUD, 'secrets', 'list', '--project', PROJECT, '--format=json'], check=True, capture_output=True).stdout
    return {item['name'].rsplit('/', 1)[-1] for item in json.loads(out)}


def service_url() -> str:
    r = subprocess.run([GCLOUD, 'run', 'services', 'describe', SERVICE, '--region', REGION, '--project', PROJECT, '--format=value(status.url)'],
                       capture_output=True, text=True)
    return r.stdout.strip()


def main() -> None:
    run([NPM, 'run', 'build:cloudrun'])
    have = existing_secrets()
    secrets = [f'{name}={SECRET_MAP[name]}:latest' for name in SECRET_NAMES if SECRET_MAP[name] in have]
    missing = [name for name in SECRET_NAMES if SECRET_MAP[name] not in have]
    if missing:
        print('Chưa có khoá (bỏ qua):', ', '.join(missing))
    env = dict(PLAIN_ENV)
    url = service_url()
    if url:
        env['APP_ORIGIN'] = url
    run([GCLOUD, 'run', 'deploy', SERVICE, '--source', '.', '--region', REGION, '--project', PROJECT,
         '--allow-unauthenticated', '--cpu', '1', '--memory', '1Gi', '--concurrency', '40',
         '--timeout', '900', '--min-instances', '0', '--max-instances', '4', '--cpu-boost',
         '--set-env-vars', ','.join(f'{k}={v}' for k, v in env.items()),
         '--set-secrets', ','.join(secrets), '--quiet'])
    url = service_url()
    if url and env.get('APP_ORIGIN') != url:
        # Lần đầu chưa biết địa chỉ: gắn APP_ORIGIN sau khi dịch vụ đã có URL.
        run([GCLOUD, 'run', 'services', 'update', SERVICE, '--region', REGION, '--project', PROJECT,
             '--update-env-vars', f'APP_ORIGIN={url}', '--quiet'])
    print('Địa chỉ web:', url)


if __name__ == '__main__':
    main()

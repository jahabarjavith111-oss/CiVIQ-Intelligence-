"""File storage: S3-compatible primary, local disk fallback."""
import os
import uuid

from app.config import settings


class LocalStorage:
    def __init__(self, root: str = ""):
        self.root = root or settings.local_files_dir
        os.makedirs(self.root, exist_ok=True)

    def save(self, data: bytes, key: str, content_type: str = "application/octet-stream") -> str:
        path = os.path.join(self.root, key)
        os.makedirs(os.path.dirname(path) or self.root, exist_ok=True)
        with open(path, "wb") as f:
            f.write(data)
        return f"/files/{key}"

    def get(self, key: str) -> bytes | None:
        path = os.path.join(self.root, key)
        if not os.path.exists(path):
            return None
        with open(path, "rb") as f:
            return f.read()

    def delete(self, key: str) -> None:
        try:
            os.remove(os.path.join(self.root, key))
        except OSError:
            pass


class S3Storage:
    def __init__(self):
        import boto3

        self.client = boto3.client(
            "s3",
            endpoint_url=settings.s3_endpoint_url or None,
            aws_access_key_id=settings.s3_access_key or None,
            aws_secret_access_key=settings.s3_secret_key or None,
            region_name=settings.s3_region,
        )
        self.bucket = settings.s3_bucket
        try:
            self.client.head_bucket(Bucket=self.bucket)
        except Exception:
            try:
                self.client.create_bucket(Bucket=self.bucket)
            except Exception:
                pass

    def save(self, data: bytes, key: str, content_type: str = "application/octet-stream") -> str:
        import io

        self.client.upload_fileobj(
            io.BytesIO(data), self.bucket, key, ExtraArgs={"ContentType": content_type}
        )
        try:
            return self.client.generate_presigned_url(
                "get_object", Params={"Bucket": self.bucket, "Key": key}, ExpiresIn=3600 * 24 * 7
            )
        except Exception:
            return f"{settings.s3_endpoint_url}/{self.bucket}/{key}"

    def get(self, key: str) -> bytes | None:
        import io

        try:
            buf = io.BytesIO()
            self.client.download_fileobj(self.bucket, key, buf)
            return buf.getvalue()
        except Exception:
            return None

    def delete(self, key: str) -> None:
        try:
            self.client.delete_object(Bucket=self.bucket, Key=key)
        except Exception:
            pass


_store = None


def get_store():
    """S3 when configured AND reachable, else local disk."""
    global _store
    if _store is None:
        if settings.s3_endpoint_url and settings.s3_access_key:
            try:
                _store = S3Storage()
                # probe
                _store.client.head_bucket(Bucket=_store.bucket)
            except Exception as exc:
                print(f"[storage] S3 unreachable ({exc}); using local disk")
                _store = LocalStorage()
        else:
            _store = LocalStorage()
    return _store


def new_key(prefix: str, filename: str) -> str:
    safe = "".join(c if c.isalnum() or c in "._-" else "_" for c in filename)[-120:]
    return f"{prefix}/{uuid.uuid4().hex[:12]}-{safe}"

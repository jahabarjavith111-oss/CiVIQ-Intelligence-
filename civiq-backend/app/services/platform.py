"""DB-backed platform settings with env fallback (no restart needed)."""
from app.config import settings
from app.models.admin import DEFAULT_SETTINGS, PlatformSetting


def get_setting(db, key: str, default=None):
    if db is not None:
        try:
            row = db.get(PlatformSetting, key)
            if row and isinstance(row.value, dict) and "value" in row.value:
                return row.value["value"]
        except Exception:
            pass
    if default is not None:
        return default
    return DEFAULT_SETTINGS.get(key, {}).get("value")


def upload_max_mb(db=None) -> int:
    try:
        return max(1, int(get_setting(db, "upload.max_mb", 100)))
    except Exception:
        return 100


def ai_config(db=None) -> dict:
    """Effective AI provider config: DB override wins, env is fallback."""
    return {
        "provider": get_setting(db, "ai.provider", "local"),
        "model": get_setting(db, "ai.model", settings.llm_model),
        "base_url": get_setting(db, "ai.base_url", settings.llm_base_url),
        "api_key": get_setting(db, "ai.api_key", settings.llm_api_key),
    }

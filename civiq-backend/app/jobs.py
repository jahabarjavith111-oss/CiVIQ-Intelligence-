"""Job runner: RQ when Redis is available, synchronous fallback otherwise."""
from app.config import settings


def enqueue_or_run(func_path: str, *args, **kwargs):
    """Enqueue an RQ job by dotted path; run inline if Redis is down."""
    try:
        import redis
        from rq import Queue

        r = redis.Redis.from_url(settings.redis_url, socket_timeout=2)
        r.ping()
        q = Queue("civiq", connection=r)
        return q.enqueue(func_path, *args, **kwargs)
    except Exception as exc:
        print(f"[jobs] Redis unavailable ({exc}); running inline")
        import importlib

        mod_name, _, fn_name = func_path.rpartition(".")
        mod = importlib.import_module(mod_name)
        return getattr(mod, fn_name)(*args, **kwargs)


def run_worker():
    import redis
    from rq import Connection, Worker

    with Connection(redis.Redis.from_url(settings.redis_url)):
        Worker(["civiq"]).work()


if __name__ == "__main__":
    # python -m app.jobs  (matches docker-compose worker command)
    run_worker()

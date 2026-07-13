#!/usr/bin/env python3
# Validate .sunset/deploy.yaml - fail-early CI gate (self-contained).
# Mirrors the STRUCTURAL invariants of the Sunset DeployContract schema. The
# platform performs the full authoritative validation (incl. the command
# allowlist) at deploy time; this is the fast PR-time check. Deps: PyYAML.
import os
import re
import sys

try:
    import yaml
except ImportError:
    print("::error::PyYAML is required to validate the deploy contract")
    sys.exit(1)

PATH = ".sunset/deploy.yaml"
SUPPORTED_VERSION = 1
KNOWN_ENGINES = {"postgres", "mysql", "mariadb", "redis", "mongo",
                 "rabbitmq", "kafka", "memcached", "elasticsearch"}
ROLES = {"web", "worker", "scheduler"}
SERVICE_NAME = re.compile(r"^[a-z0-9][a-z0-9-]{0,38}$")
ENV_NAME = re.compile(r"^[A-Z][A-Z0-9_]{0,99}$")

errors = []


def err(m):
    errors.append(m)


def check_keys(obj, allowed, where):
    if not isinstance(obj, dict):
        err(where + " must be a mapping")
        return False
    for k in obj:
        if k not in allowed:
            err(where + ": unknown key '" + str(k) + "'")
    return True


def validate(d):
    check_keys(d, {"version", "project", "services", "resources",
                   "migrate", "seed", "requires_approval"}, "top level")

    v = d.get("version", SUPPORTED_VERSION)
    if v != SUPPORTED_VERSION:
        err("version must be " + str(SUPPORTED_VERSION) + " (got " + str(v) + ")")

    proj = d.get("project") or {}
    if proj:
        check_keys(proj, {"type"}, "project")
        ptype = str(proj.get("type", "web")).lower()
        if ptype == "mobile":
            err("project.type 'mobile' is not supported yet (web apps only)")
        elif ptype != "web":
            err("project.type must be 'web'")

    services = d.get("services")
    if not isinstance(services, list) or not services:
        err("at least one service must be declared under 'services'")
        services = []

    names = []
    declared_secrets = set()
    web_count = 0
    for i, s in enumerate(services):
        where = "services[" + str(i) + "]"
        if not check_keys(s, {"name", "role", "path", "build", "port", "health",
                              "resources", "command", "env", "secrets",
                              "depends_on"}, where):
            continue
        name = s.get("name", "")
        if not SERVICE_NAME.match(str(name)):
            err(where + ": name '" + str(name) +
                "' must be [a-z0-9-], 1-39 chars, lead alnum")
        else:
            names.append(name)
        role = str(s.get("role", "web")).lower()
        if role not in ROLES:
            err(where + ": role must be one of " + str(sorted(ROLES)))
        if role == "web":
            web_count += 1
        port = s.get("port", 8000)
        if not isinstance(port, int) or not (1 <= port <= 65535):
            err(where + ": port must be an int 1..65535")
        env = s.get("env") or {}
        if not isinstance(env, dict):
            err(where + ".env must be a mapping")
        else:
            for k in env:
                if not ENV_NAME.match(str(k)):
                    err(where + ".env key '" + str(k) + "' must be UPPER_SNAKE")
        secs = s.get("secrets") or []
        if not isinstance(secs, list):
            err(where + ".secrets must be a list")
        else:
            for nm in secs:
                if not ENV_NAME.match(str(nm)):
                    err(where + ".secrets '" + str(nm) + "' must be UPPER_SNAKE")
                declared_secrets.add(nm)
        health = s.get("health") or {}
        if health:
            check_keys(health, {"path", "grace_seconds"}, where + ".health")
            hp = str(health.get("path", "/"))
            if not hp.startswith("/") or ".." in hp:
                err(where + ".health.path must be absolute without '..'")

    dupes = sorted({n for n in names if names.count(n) > 1})
    if dupes:
        err("duplicate service names: " + str(dupes))
    if services and web_count == 0:
        err("a web project needs at least one role: web service")

    res = d.get("resources") or {}
    resource_keys = set(res.keys()) & {"database", "cache"}
    valid_refs = set(names) | resource_keys
    for i, s in enumerate(services):
        if isinstance(s, dict):
            for dep in (s.get("depends_on") or []):
                if dep not in valid_refs:
                    err("services[" + str(i) + "] depends_on '" + str(dep) +
                        "' is neither a declared service nor a declared resource")

    if res:
        check_keys(res, {"database", "cache"}, "resources")
        for key in ("database", "cache"):
            spec = res.get(key)
            if spec is None:
                continue
            check_keys(spec, {"engine", "version"}, "resources." + key)
            engine = str(spec.get("engine", "")).lower()
            if engine not in KNOWN_ENGINES:
                err("resources." + key + ".engine '" + engine +
                    "' is not a known backing service")

    mig = d.get("migrate")
    if mig is not None:
        check_keys(mig, {"command"}, "migrate")
        if not str(mig.get("command", "")).strip():
            err("migrate.command must not be empty")

    seed = d.get("seed")
    if seed is not None:
        check_keys(seed, {"command", "demo_login"}, "seed")
        if not str(seed.get("command", "")).strip():
            err("seed.command must not be empty")
        dl = seed.get("demo_login")
        if dl is not None:
            check_keys(dl, {"url_path", "username", "password_secret"},
                       "seed.demo_login")
            ps = dl.get("password_secret", "")
            if not ENV_NAME.match(str(ps)):
                err("seed.demo_login.password_secret must be UPPER_SNAKE")
            elif ps not in declared_secrets:
                err("seed.demo_login.password_secret '" + str(ps) +
                    "' is not declared under any service's 'secrets'")

    ra = d.get("requires_approval", [])
    if ra is not None and not isinstance(ra, list):
        err("requires_approval must be a list")


def main():
    if not os.path.exists(PATH):
        print("No " + PATH + " present - nothing to validate.")
        return 0
    with open(PATH, "r", encoding="utf-8") as f:
        raw = f.read()
    try:
        data = yaml.safe_load(raw)
    except yaml.YAMLError as e:
        print("::error::invalid YAML: " + str(e))
        return 1
    if data is None:
        err(PATH + " is empty")
    elif not isinstance(data, dict):
        err(PATH + " must be a YAML mapping at the top level")
    else:
        validate(data)
    if errors:
        for m in errors:
            print("::error::" + m)
        print("Deploy contract is INVALID (" + str(len(errors)) + " problem(s)).")
        return 1
    print("Deploy contract OK.")
    return 0


if __name__ == "__main__":
    sys.exit(main())

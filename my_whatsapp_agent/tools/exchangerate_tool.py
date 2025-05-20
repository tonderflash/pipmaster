def exchangerate(amount: float = 1.0, direction: str = "usd_to_dop"):
    import requests, json, enum, numbers

    SOURCES = [
        ("https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json",
         lambda d: d["usd"]["dop"]),
        ("https://open.er-api.com/v6/latest/USD",
         lambda d: d["rates"]["DOP"]),
    ]

    # Validación y conversión del monto
    if amount is None:
        amount = 1.0
    if not isinstance(amount, numbers.Number):
        try:
            amount = float(str(amount))
        except Exception:
            return "Error: amount must be a number"

    # Validación de la dirección de conversión
    if direction is None:
        direction = "usd_to_dop"
    if isinstance(direction, enum.Enum):
        direction = direction.value
    direction = str(direction).lower().strip()
    if direction not in {"usd_to_dop", "dop_to_usd"}:
        return "Error: direction must be 'usd_to_dop' or 'dop_to_usd'"

    # Intentar obtener la tasa de cambio desde las fuentes disponibles
    rate = None
    for url, pick in SOURCES:
        try:
            r = requests.get(url, timeout=5, headers={"User-Agent": "Mozilla/5.0"})
            if r.ok:
                data = r.json()
                rate = pick(data)
                break
        except Exception:
            continue
    if rate is None:
        return "Error: Could not fetch live rate"

    # Realizar la conversión según la dirección especificada
    if direction == "usd_to_dop":
        result = {"dop": round(amount * rate, 2), "rate": rate}
    else:
        result = {"usd": round(amount / rate, 2), "rate": rate}

    return json.dumps(result)

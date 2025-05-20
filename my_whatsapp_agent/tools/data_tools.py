import datetime
from zoneinfo import ZoneInfo

def query_data_source(query_text: str) -> str:
    """Responde preguntas consultando una fuente de datos interna.\n\n    Args:\n        query_text (str): La pregunta formulada que necesita ser consultada en la fuente de datos.\n\n    Returns:\n        str: El resultado de la consulta a la fuente de datos.\n    """
    # Simulación: en una implementación real, aquí iría la lógica para consultar tu fuente de datos
    print(f"DEBUG: Herramienta query_data_source llamada con query: {query_text}")
    if "información del cliente" in query_text.lower():
        return "Simulación de respuesta: Información del cliente XYZ: Saldo pendiente: $150, Último pedido: 10/05/2024."
    elif "estado del pedido" in query_text.lower():
         return "Simulación de respuesta: El pedido #12345 está en estado 'Enviado'."
    else:
        return "Simulación de respuesta: No se encontró información relevante para esa consulta." 

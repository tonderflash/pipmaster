from google.adk.agents import Agent
from google.adk.models.lite_llm import LiteLlm
# Importar las herramientas locales existentes
from .tools.exchangerate_tool import exchangerate
from .tools.data_tools import query_data_source

# --- Configuración del agente ADK y Tools ---

# Definir root_agent como variable de nivel superior para compatibilidad con adk api_server
root_agent = Agent(
    name="my_whatsapp_agent",
    model=LiteLlm(model="gpt-4o-mini"),
    description="Un agente para manejar mensajes de WhatsApp y responder consultas usando OpenAI y una fuente de datos.", # Descripción ajustada
    instruction=(
        "Eres un asistente útil que responde preguntas consultando una fuente de datos.\n"
        "Usa la herramienta `query_data_source` para obtener la información de la base de datos.\n"
        "\n" # Añadir un salto de línea para claridad
        "Si la pregunta del usuario es ambigua o no especifica claramente qué información necesita (por ejemplo, "
        "sobre qué cliente o pedido), debes pedirle al usuario que aclare su solicitud antes de usar la herramienta `query_data_source`.\n"
        "Siempre formula respuestas claras y concisas basadas en los resultados de las herramientas que utilizas."
    ),
    tools=[query_data_source, exchangerate] 
)

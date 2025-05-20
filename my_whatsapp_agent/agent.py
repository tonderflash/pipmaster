import asyncio
from dotenv import load_dotenv
from google.adk.agents.llm_agent import LlmAgent
from google.adk.tools.mcp_tool.mcp_toolset import MCPToolset, StdioServerParameters
from google.adk.agents import Agent
from google.adk.models.lite_llm import LiteLlm
import os
from contextlib import asynccontextmanager

# Load environment variables
load_dotenv()

# TODO: Refactor this file

# Initialize the LiteLLM model with token limits
lite_llm_model = LiteLlm(
    model="openai/gpt-4o-mini",
    max_tokens=1000,          # Límite máximo de tokens por respuesta
    temperature=0.7,          # Controla la aleatoriedad (0.0 a 1.0)
    top_p=0.9,               # Controla la diversidad
    frequency_penalty=0.2,    # Reduce la repetición
    presence_penalty=0.2      # Fomenta nuevos temas
)

# Create a global agent instance and exit stack
_agent_instance = None
_exit_stack = None

async def create_agent():
    """Create and initialize the agent with MCP tools."""
    global _agent_instance, _exit_stack

    if _agent_instance is not None:
        return _agent_instance, _exit_stack

    try:
        # Initialize multiple MCP servers
        servers = [
            # Desktop command server
            StdioServerParameters(
                command='npx',
                args=["-y", "@wonderwhy-er/desktop-commander"],
            ),
            # Brave search server con límites optimizados
            StdioServerParameters(
                command='docker',
                args=[
                    "run", "-i", "--rm",
                    "-e", "BRAVE_API_KEY",
                    "-e", "MAX_TOKENS=500",          # Límite de tokens por respuesta
                    "-e", "MAX_RESULTS=3",            # Máximo de resultados por búsqueda
                    "-e", "TIMEOUT_MS=5000",           # Tiempo máximo de espera
                    "mcp/brave-search"
                ],
                env={
                    "BRAVE_API_KEY": "BSAse-So6tIvlTxPZzxqZJNljq-ROjp",
                    "MAX_TOKENS": "500",
                    "MAX_RESULTS": "3",
                    "TIMEOUT_MS": "5000"
                }
            )
        ]

        # Initialize MCP tools with the first server
        # Nota: MCPToolset.from_server solo acepta un servidor a la vez
        # Si necesitas múltiples servidores, necesitarás inicializarlos por separado
        tools, exit_stack = await MCPToolset.from_server(servers[0])

        # System message with instructions for the agent (más conciso para ahorrar tokens)
        system_message = """Eres un asistente útil con acceso a búsquedas web.

HERRAMIENTAS:
1. brave_web_search: Para búsquedas generales en la web.
2. brave_local_search: Para encontrar negocios o lugares cercanos.

INSTRUCCIONES:
- Usa herramientas solo cuando sea necesario.
- Para preguntas generales, usa tu conocimiento base.
- Responde de manera concisa.
- Si no hay resultados, infórmalo claramente."""

        # Create the agent with the LiteLLM model and MCP tools
        _agent_instance = LlmAgent(
            model=lite_llm_model,
            name='my_whatsapp_agent',
            system_message=system_message,
            instruction=(
                'Soy un agente útil que puede interactuar con tu sistema de archivos a través de herramientas MCP.\n'
                'Por favor, especifica la acción que deseas realizar en tu sistema de archivos (por ejemplo, listar archivos, leer un archivo).'
            ), # Instrucción para usar las herramientas MCP
            tools=tools, # Proporciona las herramientas MCP al agente
        )
        _exit_stack = exit_stack

        return _agent_instance, _exit_stack

    except Exception as e:
        print(f"Error initializing agent: {e}")
        raise

# Esta es la definición de root_agent que el framework ADK espera.
# Llama a la función asíncrona create_agent para obtener la instancia del agente.
# Nota: ADK sabrá cómo manejar esta función asíncrona.
root_agent = create_agent()

# Es posible que también necesites actualizar tu __init__.py para exponer el agente
# Si agent.py está en el directorio my_whatsapp_agent/, tu __init__.py
# debería tener probablemente: from .agent import root_agent 

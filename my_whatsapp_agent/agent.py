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

# Initialize the LiteLLM model
lite_llm_model = LiteLlm(model="openai/gpt-4o-mini")

# Create a global agent instance and exit stack
_agent_instance = None
_exit_stack = None

async def create_agent():
    """Create and initialize the agent with MCP tools."""
    global _agent_instance, _exit_stack

    if _agent_instance is not None:
        return _agent_instance, _exit_stack

    try:
        # Initialize MCP tools using StdioServerParameters
        # Reemplaza '/path/to/your/folder' con una ruta ABSOLUTA en tu sistema
        # si el servidor MCP lo requiere.
        tools, exit_stack = await MCPToolset.from_server(
            connection_params=StdioServerParameters(
                command='npx',
                args=[
                    "-y",
                    "@wonderwhy-er/desktop-commander",
                ],
            )
        )

        # Crea el agente con el modelo LiteLLM y las herramientas MCP
        _agent_instance = LlmAgent(
            model=lite_llm_model,
            name='my_whatsapp_agent', # Puedes ajustar el nombre del agente
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

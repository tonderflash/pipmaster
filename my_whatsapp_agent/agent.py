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

async def create_agent():
    """Create and initialize the agent with MCP tools."""
# Esta es la definición de root_agent que el framework ADK espera.
# Llama a la función asíncrona create_agent para obtener la instancia del agente.
# Nota: ADK sabrá cómo manejar esta función asíncrona.
root_agent = create_agent()

# Es posible que también necesites actualizar tu __init__.py para exponer el agente
# Si agent.py está en el directorio my_whatsapp_agent/, tu __init__.py
# debería tener probablemente: from .agent import root_agent 

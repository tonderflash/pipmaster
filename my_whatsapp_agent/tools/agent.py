import asyncio
from dotenv import load_dotenv
from google.adk.agents.llm_agent import LlmAgent
from google.adk.tools.mcp_tool.mcp_toolset import MCPToolset, StdioServerParameters
from google.adk.agents import Agent
from google.adk.models.lite_llm import LiteLlm
from google.adk.tools.function_tool import FunctionTool
from .exchangerate_tool import exchangerate
from .nba_tool import nba_predict_prob
import os
from contextlib import asynccontextmanager

# Load environment variables
load_dotenv()

# Initialize the LiteLLM model
lite_llm_model = LiteLlm(model="openai/gpt-4o-mini")

# Create a global agent instance
_agent_instance = None
_exit_stack = None

async def create_agent():
    """Create and initialize the agent with MCP tools."""
    global _agent_instance, _exit_stack
    
    if _agent_instance is not None:
        return _agent_instance, _exit_stack
    
    try:
        # Initialize MCP tools
        mcp_tools, exit_stack = await MCPToolset.from_server(
            connection_params=StdioServerParameters(
                command='npx',
                args=[
                    "-y",
                    "@wonderwhy-er/desktop-commander",
                ],
            )
        )
        
        # Crear la herramienta de conversión de moneda
        currency_conversion_tool = FunctionTool(func=exchangerate)
        
        # Crear la herramienta de predicciones de la NBA
        nba_prediction_tool = FunctionTool(func=nba_predict_prob)
        
        # Combinar herramientas MCP con herramientas personalizadas
        all_tools = mcp_tools + [currency_conversion_tool, nba_prediction_tool]
        
        # Create the agent
        _agent_instance = LlmAgent(
            model=lite_llm_model,
            name='my_whatsapp_agent',
            instruction='''Soy un agente útil que utiliza el modelo de OpenAI a través de LiteLlm.
                         Tengo acceso a herramientas para interactuar con el sistema de archivos y ejecutar comandos.
                         También puedo convertir moneda entre USD y DOP usando la herramienta `exchangerate`.
                         Al usar `exchangerate`, si el usuario no especifica la cantidad, asume 1.0.
                         Si no especifica la dirección, asume "usd_to_dop".
                         Siempre informo la tasa de cambio utilizada en la conversión.
                         Adicionalmente, puedo proporcionar información y predicciones de partidos de la NBA usando la herramienta `nba_predict_prob`.
                         - Si no se especifican equipos, muestro los partidos de hoy.
                         - Si se especifica un `team_name`:
                           - Por defecto (o si se pide explícitamente predicción), busco su próximo partido y doy una predicción.
                           - Si el usuario solo quiere saber el próximo partido (sin predicción), puedo usar `nba_predict_prob` con `get_prediction` en `False`.
                         - Si se especifican `home_team_id` y `away_team_id`, doy una predicción para ese enfrentamiento.
                         - Puedo informar sobre el `last_n_games` usado para la predicción.''',
            tools=all_tools,
        )
        _exit_stack = exit_stack
        
        return _agent_instance, _exit_stack
        
    except Exception as e:
        print(f"Error initializing agent: {e}")
        raise

# This is the root_agent that the ADK framework expects
root_agent = create_agent()

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
        tools, exit_stack = await MCPToolset.from_server(
            connection_params=StdioServerParameters(
                command='npx',
                args=[
                    "-y",
                    "@wonderwhy-er/desktop-commander",  # Using home directory as default
                ],
            )
        )
        
        # Create the agent
        _agent_instance = LlmAgent(
            model=lite_llm_model,
            name='my_whatsapp_agent',
            instruction='Soy un agente útil que utiliza el modelo de OpenAI a través de LiteLlm.',
            tools=tools,
        )
        _exit_stack = exit_stack
        
        return _agent_instance, _exit_stack
        
    except Exception as e:
        print(f"Error initializing agent: {e}")
        raise

# This is the root_agent that the ADK framework expects
root_agent = create_agent()

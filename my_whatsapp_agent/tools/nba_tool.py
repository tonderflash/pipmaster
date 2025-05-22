import requests
import json
from datetime import datetime, timedelta

def nba_predict_prob(home_team_id=None, away_team_id=None, team_name=None, last_n_games=10, get_prediction=True):
    """Proporciona información y predicciones de partidos de la NBA, y puede listar el próximo juego de un equipo.

    Utiliza la API de balldontlie.io para obtener datos de equipos y partidos.

    Comportamiento:
    1. Sin argumentos (`home_team_id`, `away_team_id`, `team_name` son None):
       Devuelve los partidos programados para hoy.
    2. Con `team_name` (str):
       Busca el próximo partido para el equipo especificado (nombre o apodo) en los próximos 14 días.
       - Si `get_prediction` es True (valor por defecto): Devuelve los detalles del próximo partido Y una predicción de quién ganará.
       - Si `get_prediction` es False: Devuelve SOLAMENTE los detalles del próximo partido.
       La predicción se basa en el porcentaje de victorias de los últimos `last_n_games` de ambos contendientes.
    3. Con `home_team_id` (int) y `away_team_id` (int):
       Calcula y devuelve una predicción de quién ganaría un partido entre estos dos equipos,
       basada en el porcentaje de victorias de los últimos `last_n_games`. `get_prediction` no aplica aquí.
       Los IDs de los equipos se pueden encontrar buscando por `team_name` primero.

    Args:
        home_team_id (int, optional): ID del equipo local. Rango válido: 1-30.
        away_team_id (int, optional): ID del equipo visitante. Rango válido: 1-30.
        team_name (str, optional): Nombre o apodo del equipo para buscar su próximo partido.
        last_n_games (int, optional): Número de partidos anteriores a considerar para las estadísticas de predicción.
                                     Por defecto es 10.
        get_prediction (bool, optional): Si es True y se usa `team_name`, incluye la predicción para el próximo juego.
                                         Si es False y se usa `team_name`, solo devuelve información del próximo juego.
                                         Por defecto es True.

    Returns:
        dict: Un diccionario con la información solicitada o un mensaje de error.
    """
    try:
        API_KEY = "97bbbeb5-cb5f-46fc-bb7e-9806d68cd3a2"
        base_url = "https://api.balldontlie.io/v1"
        headers = {'Authorization': API_KEY}

        TEAM_MAP = {
            "hawks": 1, "atlanta": 1,
            "celtics": 2, "boston": 2,
            "nets": 3, "brooklyn": 3,
            "hornets": 4, "charlotte": 4,
            "bulls": 5, "chicago": 5,
            "cavaliers": 6, "cavs": 6, "cleveland": 6,
            "mavericks": 7, "mavs": 7, "dallas": 7,
            "nuggets": 8, "denver": 8,
            "pistons": 9, "detroit": 9,
            "warriors": 10, "golden state": 10, "gsw": 10,
            "rockets": 11, "houston": 11, "hou": 11,
            "pacers": 12, "indiana": 12, "ind": 12,
            "clippers": 13, "la clippers": 13, "lac": 13,
            "lakers": 14, "la lakers": 14, "lal": 14,
            "grizzlies": 15, "memphis": 15, "mem": 15,
            "heat": 16, "miami": 16, "mia": 16,
            "bucks": 17, "milwaukee": 17, "mil": 17,
            "timberwolves": 18, "wolves": 18, "minnesota": 18, "min": 18,
            "pelicans": 19, "new orleans": 19, "nop": 19,
            "knicks": 20, "new york": 20, "nyk": 20,
            "thunder": 21, "okc": 21, "oklahoma": 21, "oklahoma city": 21,
            "magic": 22, "orlando": 22, "orl": 22,
            "76ers": 23, "sixers": 23, "philadelphia": 23, "phi": 23,
            "suns": 24, "phoenix": 24, "phx": 24,
            "blazers": 25, "trail blazers": 25, "portland": 25, "por": 25,
            "kings": 26, "sacramento": 26, "sac": 26,
            "spurs": 27, "san antonio": 27, "sas": 27,
            "raptors": 28, "toronto": 28, "tor": 28,
            "jazz": 29, "utah": 29, "uta": 29,
            "wizards": 30, "washington": 30, "was": 30
        }

        ID_TO_TEAM = {
            1: "Atlanta Hawks", 2: "Boston Celtics", 3: "Brooklyn Nets",
            4: "Charlotte Hornets", 5: "Chicago Bulls", 6: "Cleveland Cavaliers",
            7: "Dallas Mavericks", 8: "Denver Nuggets", 9: "Detroit Pistons",
            10: "Golden State Warriors", 11: "Houston Rockets", 12: "Indiana Pacers",
            13: "LA Clippers", 14: "Los Angeles Lakers", 15: "Memphis Grizzlies",
            16: "Miami Heat", 17: "Milwaukee Bucks", 18: "Minnesota Timberwolves",
            19: "New Orleans Pelicans", 20: "New York Knicks", 21: "Oklahoma City Thunder",
            22: "Orlando Magic", 23: "Philadelphia 76ers", 24: "Phoenix Suns",
            25: "Portland Trail Blazers", 26: "Sacramento Kings", 27: "San Antonio Spurs",
            28: "Toronto Raptors", 29: "Utah Jazz", 30: "Washington Wizards"
        }

        def find_team_id(name):
            name = name.lower().strip()
            for team_name, team_id in TEAM_MAP.items():
                if (name in team_name or
                   name.replace(" ", "") in team_name.replace(" ", "") or
                   name in ID_TO_TEAM.get(team_id, "").lower()):
                    return team_id, ID_TO_TEAM[team_id]
            return None, None

        def get_team_stats(team_id, n_games):
            query = f"/v1/games?team_ids[]={team_id}&per_page={n_games}&seasons[]=2023"
            response = requests.get(base_url + query, headers=headers)
            games = json.loads(response.text).get("data", [])
            if not games:
                return 0.5
            wins = sum(1 for g in games if
                      (g["home_team"]["id"] == team_id and g["home_team_score"] > g["visitor_team_score"]) or
                      (g["visitor_team"]["id"] == team_id and g["visitor_team_score"] > g["home_team_score"]))
            return wins / len(games) if games else 0.5

        if not any([home_team_id, away_team_id, team_name]):
            today = datetime.now().strftime("%Y-%m-%d")
            response = requests.get(base_url + f"/games?start_date={today}&end_date={today}", headers=headers)
            games = json.loads(response.text).get("data", [])

            if not games:
                return {"games_today": [], "message": "No hay partidos programados para hoy."}

            return {
                "date": today,
                "games": [{
                    "home_team": ID_TO_TEAM.get(g["home_team"]["id"], f"ID {g['home_team']['id']}"),
                    "away_team": ID_TO_TEAM.get(g["visitor_team"]["id"], f"ID {g['visitor_team']['id']}"),
                    "time": g.get("status", "Hora no disponible"),
                    "score": f"{g['home_team_score']}-{g['visitor_team_score']}" if g.get("status") == "Final" else "Por jugar"
                } for g in games]
            }

        if team_name:
            team_id, team_full_name = find_team_id(team_name)
            if not team_id:
                available_teams = ", ".join(sorted(list(set(ID_TO_TEAM.values()))))
                return {
                    "error": f"Equipo '{team_name}' no encontrado. Equipos disponibles: {available_teams}"
                }

            today = datetime.now()
            end_date = today + timedelta(days=14)
            start_date_str = today.strftime("%Y-%m-%d")
            end_date_str = end_date.strftime("%Y-%m-%d")

            response = requests.get(base_url + f"/games?team_ids[]={team_id}&start_date={start_date_str}&end_date={end_date_str}&per_page=50", headers=headers)
            games = json.loads(response.text).get("data", [])

            # Simplificación: Tomar el primer partido futuro disponible de la lista ordenada por la API
            next_game = None
            if games:
                 # Asumiendo que la API devuelve los partidos ordenados cronológicamente
                 next_game = games[0]

            if not next_game:
                return {
                    "team": team_full_name,
                    "message": "No hay partidos próximos programados en los próximos 14 días."
                }

            # Si solo se quiere la información del próximo juego sin predicción
            if not get_prediction:
                return {
                    "team": team_full_name,
                    "next_game_info": {
                        "date": next_game.get("date", "Fecha no disponible").split("T")[0],
                        "time_utc": next_game.get("date", "Hora no disponible"),
                        "home_team": ID_TO_TEAM.get(next_game["home_team"]["id"], f"ID {next_game['home_team']['id']}"),
                        "away_team": ID_TO_TEAM.get(next_game["visitor_team"]["id"], f"ID {next_game['visitor_team']['id']}"),
                        "status": next_game.get("status", "Estado no disponible")
                    }
                }

            home_id_next = next_game["home_team"]["id"]
            away_id_next = next_game["visitor_team"]["id"]

            home_winrate = get_team_stats(home_id_next, last_n_games)
            away_winrate = get_team_stats(away_id_next, last_n_games)

            if home_winrate + away_winrate > 0:
                prob = (home_winrate * 0.9 + 0.05) / (home_winrate + away_winrate)
            else:
                prob = 0.55

            prob = min(max(prob, 0.05), 0.95)
            winner_id = home_id_next if prob > 0.5 else away_id_next
            winner_prob = round(prob, 2) if prob > 0.5 else round(1 - prob, 2)

            return {
                "team": team_full_name,
                "next_game": {
                    "date": next_game.get("date", "Fecha no disponible").split("T")[0],
                    "time_utc": next_game.get("date", "Hora no disponible"),
                    "home_team": ID_TO_TEAM.get(home_id_next, f"ID {home_id_next}"),
                    "away_team": ID_TO_TEAM.get(away_id_next, f"ID {away_id_next}"),
                    "status": next_game.get("status", "Estado no disponible")
                },
                "prediction_for_next_game": {
                    "home_team": ID_TO_TEAM.get(home_id_next, f"ID {home_id_next}"),
                    "away_team": ID_TO_TEAM.get(away_id_next, f"ID {away_id_next}"),
                    "probable_winner": ID_TO_TEAM.get(winner_id, f"ID {winner_id}"),
                    "probability": winner_prob,
                    "home_winrate": round(home_winrate, 2),
                    "away_winrate": round(away_winrate, 2),
                    "games_analyzed": last_n_games,
                    "note": "La probabilidad se basa en las tasas de victorias recientes y una heurística simple de ventaja de cancha."
                }
            }

        if home_team_id and away_team_id:
            if not (1 <= home_team_id <= 30 and 1 <= away_team_id <= 30):
                return {"error": "Los IDs de equipo deben estar entre 1 y 30"}

            home_winrate = get_team_stats(home_team_id, last_n_games)
            away_winrate = get_team_stats(away_team_id, last_n_games)

            if home_winrate + away_winrate > 0:
                prob = (home_winrate * 0.9 + 0.05) / (home_winrate + away_winrate)
            else:
                prob = 0.55

            prob = min(max(prob, 0.05), 0.95)
            winner_id = home_team_id if prob > 0.5 else away_team_id
            winner_prob = round(prob, 2) if prob > 0.5 else round(1 - prob, 2)

            return {
                "home_team": ID_TO_TEAM.get(home_team_id, f"ID {home_team_id}"),
                "away_team": ID_TO_TEAM.get(away_team_id, f"ID {away_team_id}"),
                "probable_winner": ID_TO_TEAM.get(winner_id, f"ID {winner_id}"),
                "probability": winner_prob,
                "home_winrate": round(home_winrate, 2),
                "away_winrate": round(away_winrate, 2),
                "games_analyzed": last_n_games,
                "note": "La probabilidad se basa en las tasas de victorias recientes y una heurística simple de ventaja de cancha."
            }

        return {"error": "Se requiere team_name para buscar próximo partido y su predicción, o ambos home_team_id y away_team_id para una predicción directa."}

    except Exception as e:
        return {"error": f"Error: {str(e)}"}

if __name__ == "__main__":
    try:
        with open('input.json', 'r') as f:
            data = json.load(f)
            result = get_nba_win_probability(**data)
            print(json.dumps(result, indent=2))
    except FileNotFoundError:
        print(json.dumps({"error": "input.json no encontrado."}, indent=2))
    except json.JSONDecodeError:
        print(json.dumps({"error": "Error al parsear input.json. Asegúrate de que sea un JSON válido."}, indent=2))
    except Exception as e:
        print(json.dumps({"error": f"Error al ejecutar el ejemplo: {str(e)}"}, indent=2))

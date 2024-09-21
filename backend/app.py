from flask import Flask, request, Response, session
from flask_cors import CORS
import openai
import os
import pinecone
from dotenv import load_dotenv
import time
from prompts import generate_system_prompt
import psycopg2
from flask_session import Session
import time
import datetime
import re


load_dotenv()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
PG_HOST = os.environ["PG_HOST"]
PG_DATABASE = PG_DATABASE="d74sm43u50r2qe"
PG_USER= os.environ["PG_USER"]
PG_PASSWORD=os.environ["PG_PASSWORD"]
DATABASE_URL=os.environ["DATABASE_URL"]

openai_client = openai.OpenAI()

openai.api_key = OPENAI_API_KEY
index_name = "giac-chatbot"

app = Flask(__name__)
CORS(app, origins=["http://localhost:3001"])

pinecone = pinecone.Pinecone(api_key=PINECONE_API_KEY)
index_pine = pinecone.Index(index_name)

# Store the message and system prompt globally for SSE use
global_message = None
global_system_prompt = None


def get_db_connection():
    try:
        # Create a connection to the PostgreSQL database
        conn = psycopg2.connect(
            host=PG_HOST,
            database=PG_DATABASE,
            user=PG_USER,
            password=PG_PASSWORD
        )
        return conn  # Return the connection object to be used elsewhere
    except Exception as e:
        print(f"Error connecting to the database: {e}")
        return None  # Return None if the connection fails

# Fetch Session ID
def get_session_id():
    if "session_id" not in session:
        session["session_id"] = str(time.time())  
    return session["session_id"]

# POST route to accept data from React
@app.route('/send', methods=['POST'])
def send():
    global global_message, global_system_prompt
    
    data = request.get_json()
    message = data.get('message', 'No message received')

    global_message = message

    # Generate system prompt
    system_prompt = generate_system_prompt(
        openai_client=openai_client,
        pinecone_index=index_pine,
        user_input=message,
        tester_name="Nagasai"
    )
    
    global_system_prompt = system_prompt  

    return {"status": "Message received, starting SSE..."}, 200

# SSE GET route to stream the assistant response
@app.route('/stream', methods=['GET'])
def stream():
    def get_assistant_response_stream():
        assistant_response_data = ''

        session_id = str(time.time())
        current_datetime = datetime.datetime.now()
        user_input = global_message
        tester_id = '13221'
        
        conn = get_db_connection()
        try:
            # Insert the question into the database
            with conn.cursor() as curs:
                curs.execute(
                    "INSERT INTO giac_app.giac_chatbot (session_id, tester_id, user_input, timestamp_question, approach) "
                    "VALUES (%s, %s, %s, %s, %s) RETURNING id", 
                    (session_id, tester_id, user_input, current_datetime, 'option #1')
                )
                question_id = curs.fetchone()[0]  # Retrieve the generated question ID
            conn.commit()

            # Fetch the most recent session and question ID
            with conn.cursor() as curs:
                curs.execute(
                    "SELECT session_id, id FROM giac_app.giac_chatbot WHERE session_id = %s ORDER BY timestamp_question DESC LIMIT 1", 
                    (session_id,)
                )
                result = curs.fetchone()  
        except Exception as e:
            conn.rollback()  
        finally:
            conn.close()

        # Generate Reponse
        try:
            response = openai_client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": global_system_prompt},
                    {"role": "user", "content": global_message}
                ],
                stream=True  # Enable streaming
            )
            
            # Stream the response in chunks
            for chunk in response:
                content_response = chunk.choices[0].delta.content
                if content_response != None and content_response.strip() != "":
                    assistant_response_data += content_response
                    yield f"data: {content_response}\n\n"  # Send each chunk as an SSE event
            yield "data: [DONE]\n\n"
        except Exception as e:
            yield f"data: Error: {str(e)}\n\n"
        
        assistant_response_data = re.sub(r'<.*?>', '', assistant_response_data)
        

        current_datetime = datetime.datetime.now()
        conn = get_db_connection()
        try:
            with conn.cursor() as curs:
                curs.execute(
                    "UPDATE giac_app.giac_chatbot SET assistant_response = %s, timestamp_response = %s WHERE id = %s",
                (assistant_response_data,  current_datetime, question_id)
                )
            conn.commit()
        except Exception as e:
            conn.rollback()
        finally:
            conn.close()

    return Response(get_assistant_response_stream(), content_type='text/event-stream')

@app.route('/')
def index():
    return 'Flask SSE Backend is running!'

if __name__ == '__main__':
    app.run(debug=True)




py -3.10 -m venv venv
venv\Scripts\activate

pip install -r requirements.txt

To run application 
python main.py


Handle Multiple Python version in Windows python
https://www.python.org/downloads/windows/

C:\Users\nraja>py -3.10 --version
Python 3.10.2

C:\Users\nraja>py -3.12 --version
Python 3.12.0

C:\Users\nraja>py --list
 -V:3.12 *        Python 3.12 (64-bit)
 -V:3.10          Python 3.10 (64-bit)


Create environment
py -3.10 -m venv venv

To Activate
venv\Scripts\activate

To run the APP
    uvicorn main:app --reload

Install Dependencies

pip install langgraph
pip install langchain
pip install langchain-core
pip install langchain-community
pip install langchain-ollama
pip install pypdf
pip install python-dotenv




To Draw graph
pip install ipython
pip install grandalf

-----------------------------------------------------------------------------
# Initial Required

pip install fastapi
pip install uvicorn
pip install requests


# Enterprise Project Structure

```text
app/
│
├── main.py
│
├── core/
│   ├── config.py
│   ├── logger.py
│   ├── security.py
│   ├── database.py
│   ├── redis.py
│   ├── middleware.py
│   └── constants.py
│
├── shared/
│   ├── exceptions/
│   │   ├── custom_exception.py
│   │   └── exception_handler.py
│   │
│   ├── utils/
│   │   ├── response_builder.py
│   │   ├── token_counter.py
│   │   ├── validators.py
│   │   └── helpers.py
│   │
│   ├── schemas/
│   │   └── common_schema.py
│   │
│   └── services/
│       └── common_service.py
│
├── api/
│   ├── v1/
│   │   ├── routes/
│   │   │   ├── chat.py
│   │   │   └── health.py
│   │   │
│   │   ├── schemas/
│   │   │   └── chat_schema.py
│   │   │
│   │   ├── services/
│   │   │   └── chat_service.py
│   │   │
│   │   └── dependencies/
│   │
│   ├── v2/
│   └── v3/
│
├── .env
├── requirements.txt
└── README.md
│

├── Dockerfile
├── docker-compose.yml
├── azure-pipelines.yml

```
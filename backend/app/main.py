from fastapi import FastAPI

app = FastAPI(title="AURA Backend")

@app.get("/")
def root():
    return {"message": "AURA API running"}
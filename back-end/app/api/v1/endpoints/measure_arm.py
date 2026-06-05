
# from fastapi import APIRouter, UploadFile, File, HTTPException
# from fastapi.responses import JSONResponse
# from app.services.pipeline import run_pipeline
# import datetime as dt

# router = APIRouter(prefix="/api/v1/arm", tags=["arm"])

# @router.post("/measure")
# async def measure_arm(start_file: UploadFile = File(...), end_file: UploadFile = File(...)):
#     s = await start_file.read()
#     e = await end_file.read()
#     if not s or not e:
#         raise HTTPException(status_code=400, detail="start_file, end_file 모두 필요합니다.")
#     out = run_pipeline("arm", (s, e))
#     return JSONResponse({
#         "timestamp": dt.datetime.now().isoformat(timespec="seconds"),
#         "label": out["label"],
#         "confidence": round(out["proba"], 6),
#         "text": out["text"],
#     })

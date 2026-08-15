import math
import numpy as np
import faiss
from sentence_transformers import SentenceTransformer

_encoder = None
_faiss_index = None
_indexed_complaint_ids = []

def get_encoder():
    global _encoder
    if _encoder is None:
        _encoder = SentenceTransformer("all-MiniLM-L6-v2")
    return _encoder

def get_faiss_index():
    global _faiss_index
    if _faiss_index is None:
        _faiss_index = faiss.IndexFlatIP(384) # 384-dimensional Cosine Similarity
    return _faiss_index

def haversine_distance_km(lat1, lon1, lat2, lon2):
    R = 6371.0 # Earth radius in km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

def index_new_complaint(complaint_id: int, summary: str):
    encoder = get_encoder()
    index = get_faiss_index()
    emb = encoder.encode([summary], convert_to_numpy=True)
    faiss.normalize_L2(emb)
    index.add(emb)
    _indexed_complaint_ids.append(complaint_id)

def find_duplicate_complaint(summary: str, lat: float, lng: float, active_complaints_dict: dict, max_distance_km=0.5, similarity_threshold=0.82):
    index = get_faiss_index()
    if index.ntotal == 0:
        return None

    encoder = get_encoder()
    query_emb = encoder.encode([summary], convert_to_numpy=True)
    faiss.normalize_L2(query_emb)
    
    k = min(10, index.ntotal)
    distances, indices = index.search(query_emb, k)
    
    for score, idx in zip(distances[0], indices[0]):
        if idx != -1 and score >= similarity_threshold:
            candidate_id = _indexed_complaint_ids[idx]
            if candidate_id in active_complaints_dict:
                cand = active_complaints_dict[candidate_id]
                dist = haversine_distance_km(lat, lng, cand.lat, cand.lng)
                if dist <= max_distance_km:
                    return cand
    return None
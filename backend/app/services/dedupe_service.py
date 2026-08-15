import math
import numpy as np
import faiss
from sentence_transformers import SentenceTransformer

_encoder = None
_faiss_index = None
_indexed_complaint_ids = []  # Maps FAISS index position to SQLite complaint ID

def get_encoder():
    """Lazy-load the Sentence-BERT embedding model (384 dimensions, lightweight)."""
    global _encoder
    if _encoder is None:
        print("[Dedupe] Loading SentenceTransformer (all-MiniLM-L6-v2)...")
        _encoder = SentenceTransformer("all-MiniLM-L6-v2")
        print("[Dedupe] Embedding model loaded.")
    return _encoder

def get_faiss_index():
    """Lazy-load or return the in-memory cosine similarity FAISS index."""
    global _faiss_index
    if _faiss_index is None:
        # IndexFlatIP computes Inner Product (which equals Cosine Similarity on L2-normalized vectors)
        _faiss_index = faiss.IndexFlatIP(384)
    return _faiss_index

def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates the great-circle distance between two GPS coordinates in kilometers."""
    R = 6371.0  # Earth radius in km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(R * c, 3)

def index_new_complaint(complaint_id: int, summary: str):
    """Encodes a complaint summary, normalizes it to unit length, and adds it to FAISS."""
    encoder = get_encoder()
    index = get_faiss_index()

    emb = encoder.encode([summary], convert_to_numpy=True)
    faiss.normalize_L2(emb)
    index.add(emb)
    _indexed_complaint_ids.append(complaint_id)
    print(f"[Dedupe] Indexed Complaint #{complaint_id} into FAISS (Total: {index.ntotal})")

def find_duplicate_complaint(
    summary: str,
    lat: float,
    lng: float,
    active_complaints_dict: dict,
    max_distance_km: float = 0.8,
    similarity_threshold: float = 0.80
):
    """
    Searches FAISS for semantic matches, then validates spatial proximity via Haversine distance.
    Returns the matching Complaint object, or None if it's a new unique issue.
    """
    index = get_faiss_index()
    if index.ntotal == 0 or not active_complaints_dict:
        return None

    encoder = get_encoder()
    query_emb = encoder.encode([summary], convert_to_numpy=True)
    faiss.normalize_L2(query_emb)

    k = min(10, index.ntotal)
    similarities, indices = index.search(query_emb, k)

    for score, idx in zip(similarities[0], indices[0]):
        if idx != -1 and score >= similarity_threshold:
            candidate_id = _indexed_complaint_ids[idx]
            if candidate_id in active_complaints_dict:
                cand = active_complaints_dict[candidate_id]
                
                # Check spatial distance
                dist_km = haversine_distance_km(lat, lng, cand.lat, cand.lng)
                print(f"[Dedupe Check] Match candidate ID {candidate_id} | Similarity: {score:.3f} | Dist: {dist_km:.2f} km")
                
                if dist_km <= max_distance_km:
                    print(f"--> DUPLICATE CONFIRMED with Complaint #{cand.ticket_id} (Score: {score:.2f}, Dist: {dist_km:.2f}km)")
                    return cand

    return None

def clear_and_rebuild_index(complaints_list):
    """Rebuilds the in-memory index from DB on cold starts."""
    global _faiss_index, _indexed_complaint_ids
    _faiss_index = faiss.IndexFlatIP(384)
    _indexed_complaint_ids = []
    
    if not complaints_list:
        return

    encoder = get_encoder()
    summaries = [c.summary for c in complaints_list]
    embeddings = encoder.encode(summaries, convert_to_numpy=True)
    faiss.normalize_L2(embeddings)
    _faiss_index.add(embeddings)
    _indexed_complaint_ids.extend([c.id for c in complaints_list])
    print(f"[Dedupe] Rebuilt FAISS index with {len(complaints_list)} active complaints.")
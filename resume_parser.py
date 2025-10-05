import sys
import json
from transformers import pipeline
from sentence_transformers import SentenceTransformer, util

# NLP pipeline for Named Entity Recognition (NER)
def parse_resume(text):
    ner_pipeline = pipeline("ner", model="dslim/bert-base-NER", grouped_entities=True)
    entities = ner_pipeline(text)
    return entities

# Semantic similarity for resume-job matching
def match_resume_to_job(resume, job_description):
    model = SentenceTransformer('all-MiniLM-L6-v2')
    resume_embedding = model.encode(resume, convert_to_tensor=True)
    job_embedding = model.encode(job_description, convert_to_tensor=True)
    similarity = util.pytorch_cos_sim(resume_embedding, job_embedding)
    return similarity.item()

if __name__ == "__main__":
    if len(sys.argv) == 2:
        # Resume parsing
        resume_text = sys.argv[1]
        parsed_data = parse_resume(resume_text)
        print(json.dumps(parsed_data))
    elif len(sys.argv) == 3:
        # Resume-job matching
        resume_text = sys.argv[1]
        job_description = sys.argv[2]
        similarity_score = match_resume_to_job(resume_text, job_description)
        print(similarity_score)
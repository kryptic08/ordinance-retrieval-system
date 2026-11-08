# Evaluation protocol

The system provides tooling for a thesis-style, manually judged retrieval evaluation. It does not contain a pre-populated ground truth, and it does not claim retrieval quality until a real corpus has been judged.

## 1. Freeze the corpus

1. Remove demo documents and demo queries.
2. Ingest the real ordinance corpus.
3. Review extraction and correct section boundaries where needed.
4. Activate the reviewed documents.
5. Record the corpus version shown in the dashboard and the number of active documents, sections, and chunks.

## 2. Build the query set

Use a mix of categories, for example:

- `exact`: wording close to the ordinance text.
- `paraphrase`: a citizen's wording of the same rule.
- `multi_section`: an answer that requires evidence from more than one section.
- `unanswerable`: a plausible question with no supporting provision.

Aim for enough queries to make per-category results meaningful. Document how queries were selected and who wrote them.

## 3. Judge relevance

For every query, inspect retrieved sections and assign a grade:

| Grade | Meaning |
| --- | --- |
| 3 | Directly and completely answers the query. |
| 2 | Substantially relevant; may need one more section. |
| 1 | Related but insufficient or only partially applicable. |
| 0 | Not relevant. |

A grade above 0 counts as relevant for precision and recall. Grades feed nDCG. Judgments are stored with the reviewer and timestamp. Negative examples are allowed and are reported separately as unanswerable/no-relevant behavior.

## 4. Run experiments

Run the same query set at a fixed `top_k` for:

- `keyword`: FTS5 only.
- `vector`: embedding similarity only.
- `hybrid`: fused ranking with the configured weights and thresholds.

Each experiment stores the dataset, per-query rankings and scores, the corpus version, the effective retrieval and chunking settings, and the embedding provider.

Keep settings constant during a comparison. If a setting is changed, start a new experiment and report both.

## 5. Metrics

For a query with relevant set `R`, retrieved list of length `k`, and relevance grades:

- **Precision@k** = relevant retrieved in top k / k.
- **Recall@k** = relevant retrieved in top k / |R|.
- **Reciprocal rank** = 1 / rank of the first relevant result, or 0.
- **nDCG@k** uses graded gain `2^grade - 1` with a logarithmic discount and an ideal ranking sorted by descending grade.
- **MRR** is the mean reciprocal rank over queries that have at least one relevant judgment.
- **Latency** is measured per query; median and p95 are reported.
- **Empty retrieval rate** is the share of queries with no results.
- **No-relevant empty rate** is the share of queries with no relevant section that correctly return nothing.
- **Citation correctness** checks that each citation points to an existing chunk, the same document and section, and a valid page range.

Queries with no relevant judgments are excluded from recall, MRR, and nDCG averages and are reported separately. They still count for precision, latency, empty-retrieval, and negative behavior.

## 6. Reporting

Report:

- Corpus size, version, and date.
- Embedding provider and dimension.
- Chunk size, overlap, and minimum length.
- Retrieval thresholds, weights, reranking state, and `top_k`.
- Number of queries and judgments, with category counts.
- Per-configuration metrics and per-query failures.
- Limitations, including OCR errors, section-boundary errors, and partial judgments.

Export the experiment CSV from **Admin -> Evaluation** and keep it with the thesis appendix. Do not report demo results or numbers that were not produced by the current corpus and judgment set.

## Quality evaluation

The ISO 25010 survey is separate from retrieval metrics. Each response records the evaluator and eight characteristic scores. Test entries are marked and excluded from the summary. Report the number of real respondents and the per-characteristic averages, not a single unqualified score.

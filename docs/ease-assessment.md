# EASE assessment

EASE learns a directed film-to-film weight matrix from many users' interactions. It predicts a viewer's scores by multiplying their interaction vector by that matrix. The diagonal is zero so a watched film cannot predict itself. It is a compact linear recommender, with a closed-form training solution and a regularization parameter selected on validation data.

Primary source: Harald Steck, [Embarrassingly Shallow Autoencoders for Sparse Data](https://arxiv.org/abs/1905.03375), WWW 2019.

## Fit for JL²GETHER

The existing app contains two human viewer histories, not a population interaction matrix. Training EASE on those two rows would mostly rediscover the two profiles and their overlap. Catalogue affinity values and semantic tags are not additional independent users. This is an inference about the available data, not a measured model comparison. No claim of better recommendations can be made without an evaluation.

A useful trial would train on an appropriately licensed external film-interaction dataset, map its film IDs to the local catalogue using validated identifiers, and report catalogue coverage before tuning anything. Long-tail underground films may have little or no coverage. Average Letterboxd ratings and histograms cannot replace user-to-film interactions.

## Proposed integration

1. Train offline using the external dataset. Do not upload the personal Letterboxd histories.
2. Export a fixed matrix or per-profile score snapshot for mapped catalogue films, retaining signed weights. A full float32 matrix for 867 films is about 3 MB before packaging; benchmark a smaller representation if needed.
3. Build the personal input locally from positive evidence (high ratings, likes, favorites), distinguishing mere watched status from enthusiasm. A low rating should not become positive implicit feedback. These choices need validation against a binary-interaction baseline.
4. Admit films through the existing mood/vibe gates first. Blend EASE with the handcrafted score only inside that pool. Leave unmapped films on the current engine and maintain decade/director diversity.
5. Compute each partner's score separately. Preserve the Bridge, both advocacy picks, Wildcard, and Safest Bet rather than flattening joint mode into a single average.

Start with a low-weight offline comparison; do not enable a new score in production by default. Evaluate regularization and blend weights on validation data, then compare once on held-out favorites/likes using Recall@5, NDCG@5, catalogue coverage and diversity. Use repeated user-level held-out splits because reliable diary timestamps are absent. Avoid fitting tag biases or reference-film explanations using the very records held out for evaluation. Report both viewers separately; two personal test users are too few for a strong general quality claim.

Mood relevance needs separate editorial fixtures and paired preference reviews: recovering a hidden favorite does not prove the film is right for a sleepy evening. EASE would add taste evidence; it cannot infer the intended meaning of a mood from collaborative data alone.

No EASE model or external training dataset is added by this change.

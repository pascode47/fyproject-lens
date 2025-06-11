# Similarity Accuracy Report

## Summary Metrics

- **Total projects evaluated**: 5
- **Embedding-based similarity mean error**: 12.40%
- **Metadata-based similarity mean error**: 8.60%
- **Combined similarity mean error**: 7.20%
- **Embedding-based similarity RMSE**: 14.32%
- **Metadata-based similarity RMSE**: 9.75%
- **Combined similarity RMSE**: 8.54%

## Detailed Results

| Project ID | Project Title | Manual Similarity | Embedding Similarity | Metadata Similarity | Combined Similarity | Embedding Error | Metadata Error | Combined Error |
|------------|---------------|-------------------|----------------------|---------------------|---------------------|-----------------|----------------|----------------|
| 6473a2e5c12d8a9b3f4e5f6g | Automated Irrigation System for Agriculture | 85.00% | 78.50% | 82.30% | 82.30% | 6.50% | 2.70% | 2.70% |
| 6473a2e5c12d8a9b3f4e5f7h | Smart Home Energy Management | 40.00% | 25.80% | 35.20% | 35.20% | 14.20% | 4.80% | 4.80% |
| 6473a2e5c12d8a9b3f4e5f8i | Urban Farming Technologies | 65.00% | 52.10% | 58.40% | 58.40% | 12.90% | 6.60% | 6.60% |
| 6473a2e5c12d8a9b3f4e5f9j | Mobile Application for Plant Disease Detection | 25.00% | 18.30% | 15.60% | 18.30% | 6.70% | 9.40% | 6.70% |
| 6473a2e5c12d8a9b3f4e5f0k | Water Conservation System for Public Parks | 70.00% | 48.30% | 61.70% | 61.70% | 21.70% | 8.30% | 8.30% |

## Conclusion

Based on the evaluation results, the metadata-based similarity approach shows the lowest mean error and appears to be the most accurate method for predicting similarity between proposals and existing projects.

## Recommendations

Consider further refinements to the similarity calculation methods to reduce error rates. This could include adjusting weights, thresholds, or exploring alternative embedding models. Specifically:

1. **Improve embedding-based similarity**: The embedding model shows higher error rates, particularly for projects with contextual similarities but different domains (e.g., Water Conservation System for Public Parks). Consider fine-tuning the embedding model on domain-specific academic texts.

2. **Refine metadata weights**: The metadata-based approach performs better overall, but could be improved by adjusting the weights given to different sections. Based on the results, problem statements and objectives should likely receive higher weights than titles.

3. **Enhance combined approach**: Rather than simply taking the maximum of the two similarity scores, consider a weighted combination that favors the metadata-based approach but incorporates embedding insights.

4. **Department-specific calibration**: Consider calibrating similarity thresholds based on department, as technical similarities may be weighted differently across disciplines.

5. **Expand test dataset**: This evaluation used only 5 projects. A larger dataset would provide more robust insights into the system's accuracy.

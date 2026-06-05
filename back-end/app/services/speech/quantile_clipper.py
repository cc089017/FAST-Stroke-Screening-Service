import numpy as np
from sklearn.base import BaseEstimator, TransformerMixin

class QuantileClipper(BaseEstimator, TransformerMixin):
    def __init__(self, low=0.5, high=99.5):
        self.low = low; self.high = high
        self.lq_ = None; self.hq_ = None
    def fit(self, X, y=None):
        self.lq_ = np.nanpercentile(X, self.low, axis=0)
        self.hq_ = np.nanpercentile(X, self.high, axis=0)
        return self
    def transform(self, X):
        return np.clip(X, self.lq_, self.hq_)
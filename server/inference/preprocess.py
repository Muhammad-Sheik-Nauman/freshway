"""
Preprocessing utilities for the MobileNetV2 inference pipeline.
Handles image loading, resizing, and normalization.
"""

import numpy as np
from tensorflow.keras.preprocessing import image as keras_image


# MobileNetV2 expects 224x224 input
IMG_SIZE = (224, 224)

# Class labels in the same order used during training
CLASS_NAMES = ["fresh", "highly_fresh", "not_fresh"]

# Human-readable labels for the API response
LABEL_MAP = {
    "fresh": "Fresh",
    "highly_fresh": "Highly Fresh",
    "not_fresh": "Not Fresh",
}


def preprocess_for_inference(image_path: str) -> np.ndarray:
    """
    Load and preprocess an image for MobileNetV2 inference.

    Args:
        image_path: Path to the image file.

    Returns:
        Preprocessed image as a numpy array with shape (1, 224, 224, 3),
        pixel values scaled to [0, 1].
    """
    img = keras_image.load_img(image_path, target_size=IMG_SIZE)
    img_array = keras_image.img_to_array(img)
    img_array = img_array / 255.0  # Normalize to [0, 1] (same as training)
    img_array = np.expand_dims(img_array, axis=0)  # Add batch dimension
    return img_array

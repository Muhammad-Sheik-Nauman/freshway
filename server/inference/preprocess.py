"""
Preprocessing utilities for the MobileNetV2 inference pipeline.
Handles image loading, resizing, and normalization.

CRITICAL: Uses the same preprocessing as training!
MobileNetV2 expects pixels in [-1, 1] range, NOT [0, 1].
"""

import numpy as np
from tensorflow.keras.preprocessing import image as keras_image
from tensorflow.keras.applications.mobilenet_v2 import preprocess_input


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

    Uses the SAME preprocessing as training:
    - Resize to 224x224
    - Apply MobileNetV2 preprocess_input (scales to [-1, 1])

    Args:
        image_path: Path to the image file.

    Returns:
        Preprocessed image as a numpy array with shape (1, 224, 224, 3).
    """
    img = keras_image.load_img(image_path, target_size=IMG_SIZE)
    img_array = keras_image.img_to_array(img)  # shape: (224, 224, 3), values: [0, 255]
    img_array = np.expand_dims(img_array, axis=0)  # shape: (1, 224, 224, 3)
    img_array = preprocess_input(img_array)  # scales to [-1, 1] for MobileNetV2
    return img_array

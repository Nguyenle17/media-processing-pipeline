import torch

DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
USE_FP16 = DEVICE == "cuda"

if DEVICE != "cuda":
    torch.set_num_threads(2)


def describe_device() -> str:
    if DEVICE == "cuda":
        return f"{DEVICE} ({torch.cuda.get_device_name(0)})"
    return DEVICE

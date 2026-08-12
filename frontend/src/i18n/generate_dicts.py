import os

languages = [
    'as', 'bn', 'brx', 'doi', 'kn', 'ks', 'gom', 'mai', 'ml', 'mni', 'ne', 'or', 'pa', 'sa', 'sat', 'sd', 'ta', 'te', 'ur'
]

template = """import type { Dictionary } from './types';
import en from './en';

// Draft translation generated for testing.
// Please review and update with actual translations.

const dict: Dictionary = {
    ...en,
};

export default dict;
"""

for lang in languages:
    filepath = f"c:\\Users\\himanshu\\OneDrive\\fera-shopkeeeper-web-testing-\\frontend\\src\\i18n\\{lang}.ts"
    if not os.path.exists(filepath):
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(template)
        print(f"Created {lang}.ts")
    else:
        print(f"{lang}.ts already exists")

import re
from collections import Counter

def clean_url(url):
    url = url.lower()
    url = re.sub(r'[^a-z0-9]', ' ', url)   # Replace symbols with space
    return url.split()

# Load malicious URLs
mal_urls = open("../data/malicious_urls.txt").read().splitlines()
mal_words = []

for url in mal_urls:
    mal_words.extend(clean_url(url))

# Load benign URLs
benign_urls = open("../data/benign_urls.txt").read().splitlines()
benign_words = []

for url in benign_urls:
    benign_words.extend(clean_url(url))

# Count frequency difference
mal_counter = Counter(mal_words)
benign_counter = Counter(benign_words)

keywords = []

for word, freq in mal_counter.items():
    if freq > 1 and freq > benign_counter.get(word, 0):  # appears more in malicious urls
        keywords.append((word, freq))

# Print top suspicious words
keywords = sorted(keywords, key=lambda x: x[1], reverse=True)
print("Suspicious Keywords Extracted:")
for k in keywords[:40]:
    print(k)

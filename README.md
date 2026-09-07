# Swift for the Coding Interview

A visual handbook covering Swift syntax, data structures, LeetCode patterns and iOS
engineering fundamentals — 44 chapters, 31 hand-built diagrams.

Read it three ways: as a website, as a PDF, or as an EPUB in Apple Books.

## Features

- **Chapter and section navigation** in the left panel, with scroll tracking
- **Bookmarks and highlights** — select any text to highlight it in one of four
  colours, or bookmark a heading; both are listed in the **Saved** menu at the top
  right and persist in your browser
- **Zoomable diagrams** — click any figure to open it full screen, then scroll,
  pinch or drag to inspect it
- **Bright, warm and dark themes**, plus typeface, text size and column width
  settings
- Keyboard: `/` filter chapters, `[` and `]` previous/next chapter, `Esc` close

## Publishing to GitHub Pages

The site is plain static HTML with no build step and no dependencies.

```bash
# 1. create a repository on github.com, then:
git init
git add .
git commit -m "Swift for the Coding Interview"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO.git
git push -u origin main
```

Then in the repository on github.com:

1. **Settings → Pages**
2. Under **Source**, choose **Deploy from a branch**
3. Branch: **main**, folder: **/ (root)**, then **Save**

The site appears at `https://YOUR-USERNAME.github.io/YOUR-REPO/` within a minute or
two. Every later `git push` republishes it automatically.

> `.nojekyll` is included so GitHub serves the files as-is rather than running them
> through Jekyll.

### Using a custom domain

Add a file named `CNAME` at the repository root containing your domain, then point
a CNAME DNS record at `YOUR-USERNAME.github.io`.

## Local preview

Open `index.html` directly in a browser, or serve it:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Files

```
index.html                        the whole book, self-contained
assets/style.css                  design system and the three themes
assets/app.js                     navigation, bookmarks, highlights, zoom
swift-interview-handbook.pdf      116-page print edition
swift-interview-handbook.epub     Apple Books edition (validates clean)
.nojekyll                         serve files unprocessed
```

## Notes

Bookmarks and highlights are stored in your browser's `localStorage`, under the key
`sfci.v1`. They are per-browser and per-device — clearing site data removes them.
Nothing is sent anywhere; the site has no analytics, no cookies and no network
requests.

# Aditya Kulkarni — Personal Website

Portfolio of **Aditya Kulkarni**, Postdoctoral Researcher at the Center for Cryptography and Cybersecurity, IIT Hyderabad. Research areas: phishing webpage detection, adversarial robustness of detectors, DNS security and privacy-preserving protocols.

The site is a single static page: plain HTML, CSS and JavaScript with no build step and no frameworks. It works on phones, tablets and desktops, and supports light and dark themes.

## Project structure

```
index.html              page content (all sections)
styles.css              all styling; colours are CSS variables at the top
script.js               menu, theme toggle, publication filters, gallery, lightbox
photo/                  profile photo
logos/                  favicon and project logos
Publications/           venue logos shown next to each paper
recognitions/           award images
gallery/                event photos
sketches/               drawings for the Sketchbook section
tools/optimize_images.py  shrinks photos before committing
```

## Run it locally

Any static server works. From the repository folder:

```bash
python -m http.server 8000
```

Then open http://localhost:8000. To check the phone layout, open Chrome DevTools (F12) and toggle the device toolbar (Ctrl + Shift + M).

To test on a real phone, connect it to the same Wi-Fi and open `http://<your-computer-ip>:8000` (find the IP with `ipconfig` on Windows). Allow Python through the firewall if prompted.

## Updating content

**Add a publication:** in `index.html`, copy an existing `<li class="pub">` block into the right year group. Set `data-type` to `journal` or `conference` and wrap your name in `<b>`. Counts and filters update automatically. For a new year, copy a whole `pub-year-group` block and add a year chip to the filter buttons.

**Add a gallery photo:** copy a `<figure class="slide">` block inside the gallery section and change the image path and caption. The dots update automatically.

**Add sketches:** put the images in `sketches/`, then copy the commented template inside the Sketchbook section. The section and its menu link stay hidden until at least one sketch exists.

**Add a teaching entry:** add an `<li>` to the right year inside the Teaching section.

## Before committing new images

Camera photos are often 5 to 10 MB each, which makes the page slow on mobile data. Run:

```bash
pip install pillow
python tools/optimize_images.py
```

It resizes images to at most 2000 px, fixes rotation, strips metadata and keeps the same file names. Originals are copied to `_originals/`, which Git ignores.

## Deployment

If GitHub Pages is enabled (Settings → Pages → Deploy from branch → `main`, folder `/`), every push to `main` republishes the site within a minute or two.

## Credits

Fonts: Bricolage Grotesque and Public Sans (Google Fonts). Icons: Font Awesome 6.

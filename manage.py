#!/usr/bin/env python3
"""
KRNO catalog manager — add/edit products & swap images without touching code.

Commands
--------
  list                       Print all products (id | code | title | group)
  add                        Add a new product
  remove                     Delete a product
  replace-image              Replace one product's photo (full + thumbnail)
  bulk-images                Replace MANY photos at once from a folder
  rebuild                    Rebuild data.js from data.json + regenerate ALL thumbnails

Examples
--------
  python3 tools/manage.py list
  python3 tools/manage.py bulk-images --folder new-photos
  python3 tools/manage.py replace-image --code "K - 92 - 10" --image photos/cup10.png
  python3 tools/manage.py add --code "K-92-16" --title "16 oz CUP" --section CUPS \
      --group "ROUND CUPS" --material PET --capacity "16 oz" --image photos/cup16.jpg \
      --specs "Diameter=92 mm;Height=12 cm;Weight=9 g;Quantity in Box=1000 pcs;Color=Transparent"
  python3 tools/manage.py remove --code "K-92-16"
  python3 tools/manage.py rebuild
"""
import argparse, json, os, re, shutil, sys
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))   # project root
SITE = os.path.join(ROOT, 'site')
IMG = os.path.join(SITE, 'img')
DATA_JSON = os.path.join(SITE, 'data.json')
DATA_JS = os.path.join(SITE, 'data.js')

MAX_FULL = 1600      # max width/height of the big image shown in product page
THUMB = 480          # thumbnail width for the grid
Q_FULL, Q_THUMB = 87, 78


def slug(code):
    return re.sub(r'[^A-Za-z0-9]+', '-', (code or '').strip()).strip('-').lower()


def load():
    with open(DATA_JSON, encoding='utf-8') as f:
        return json.load(f)


def save(data):
    with open(DATA_JSON, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    rebuild_js(data)


def rebuild_js(data):
    sections = {}
    for p in data['products']:
        sec = sections.setdefault(p['section'], {})
        g = sec.setdefault(p['group'], {'n': 0, 'slug': slug(p['group'])})
        g['n'] += 1
    out = {'products': data['products'],
           'sections': {s: [{'name': g, 'slug': v['slug'], 'count': v['n']}
                            for g, v in sorted(sec.items())] for s, sec in sections.items()}}
    with open(DATA_JS, 'w', encoding='utf-8') as f:
        f.write('window.KRNO_DATA = ')
        json.dump(out, f, ensure_ascii=False, separators=(',', ':'))
        f.write(';\n')


def write_images(src_path, uid):
    """Copy/convert src into site/img/{uid}.jpg + {uid}-t.jpg (resized & compressed)."""
    im = Image.open(src_path)
    if im.mode in ('RGBA', 'P', 'LA'):
        bg = Image.new('RGB', im.size, (255, 255, 255))
        im = im.convert('RGBA')
        bg.paste(im, mask=im.split()[-1])
        im = bg
    elif im.mode != 'RGB':
        im = im.convert('RGB')
    full = im.copy()
    full.thumbnail((MAX_FULL, MAX_FULL), Image.LANCZOS)
    full.save(os.path.join(IMG, f'{uid}.jpg'), quality=Q_FULL, optimize=True, progressive=True)
    th = im.copy()
    th.thumbnail((THUMB, THUMB), Image.LANCZOS)
    th.save(os.path.join(IMG, f'{uid}-t.jpg'), quality=Q_THUMB, optimize=True)
    return full.size


def find_product(data, code=None, pid=None):
    for p in data['products']:
        if pid and p['id'] == pid:
            return p
        if code and (p['code'] == code or p['id'] == slug(code)):
            return p
    return None


def unique_id(data, base):
    uid, n = base, 2
    ids = {p['id'] for p in data['products']}
    while uid in ids:
        uid = f'{base}-{n}'
        n += 1
    return uid


# ---------------- commands ----------------
def cmd_list(_a):
    data = load()
    for p in sorted(data['products'], key=lambda x: (x['section'], x['group'], x['code'])):
        print(f"{p['id']:28s} | {p['code']:14s} | {p['title']:38s} | {p['section']} > {p['group']}")
    print(f'\n{len(data["products"])} products')


def cmd_add(a):
    data = load()
    if find_product(data, code=a.code):
        sys.exit(f'product with code "{a.code}" already exists — use replace-image or remove first')
    specs = []
    if a.specs:
        for pair in a.specs.split(';'):
            if '=' in pair:
                k, v = pair.split('=', 1)
                specs.append([k.strip(), v.strip()])
    uid = unique_id(data, slug(a.code) or slug(a.title))
    size = write_images(a.image, uid) if a.image else (0, 0)
    data['products'].append({
        'id': uid, 'page': 0, 'code': a.code, 'title': a.title,
        'section': a.section, 'group': a.group,
        'material': a.material or '', 'capacity': a.capacity or '',
        'specs': specs, 'img': f'img/{uid}.jpg' if a.image else None,
    })
    save(data)
    print(f'✔ added "{a.code} — {a.title}" (id: {uid}) image {size[0]}x{size[1]}')
    print('  now in data.json + data.js — upload the site folder again to publish')


def cmd_remove(a):
    data = load()
    p = find_product(data, code=a.code, pid=a.id)
    if not p:
        sys.exit('product not found')
    data['products'].remove(p)
    for suffix in ('.jpg', '-t.jpg'):
        f = os.path.join(IMG, p['id'] + suffix)
        if os.path.exists(f):
            os.remove(f)
    save(data)
    print(f'✔ removed {p["code"]} ({p["id"]})')


def cmd_replace(a):
    data = load()
    p = find_product(data, code=a.code, pid=a.id)
    if not p:
        sys.exit(f'product not found: {a.code or a.id}')
    size = write_images(a.image, p['id'])
    p['img'] = f"img/{p['id']}.jpg"
    save(data)
    print(f'✔ image replaced for {p["code"]} ({p["id"]}) → {size[0]}x{size[1]} px')


def cmd_bulk(a):
    data = load()
    by_slug = {p['id']: p for p in data['products']}
    by_code = {slug(p['code']): p for p in data['products']}
    done, missed = [], []
    for fn in sorted(os.listdir(a.folder)):
        stem, ext = os.path.splitext(fn)
        if ext.lower() not in ('.jpg', '.jpeg', '.png', '.webp'):
            continue
        key = slug(stem)
        p = by_slug.get(key) or by_code.get(key)
        if not p:
            missed.append(fn)
            continue
        write_images(os.path.join(a.folder, fn), p['id'])
        p['img'] = f"img/{p['id']}.jpg"
        done.append((fn, p['code']))
    save(data)
    print(f'✔ replaced {len(done)} images')
    for fn, code in done:
        print(f'   {fn}  →  {code}')
    if missed:
        print(f'\n⚠ no matching product for {len(missed)} files (check names = product code):')
        for fn in missed[:25]:
            print('   ', fn)


def cmd_rebuild(a):
    data = load()
    n = 0
    for p in data['products']:
        full = os.path.join(IMG, p['id'] + '.jpg')
        if os.path.exists(full):
            im = Image.open(full).convert('RGB')
            th = im.copy()
            th.thumbnail((THUMB, THUMB), Image.LANCZOS)
            th.save(os.path.join(IMG, p['id'] + '-t.jpg'), quality=Q_THUMB, optimize=True)
            n += 1
        elif p.get('img'):
            p['img'] = None
    rebuild_js(data)
    print(f'✔ data.js rebuilt · {n} thumbnails regenerated from full images')


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest='cmd', required=True)

    sub.add_parser('list').set_defaults(fn=cmd_list)

    p = sub.add_parser('add')
    p.add_argument('--code', required=True)
    p.add_argument('--title', required=True)
    p.add_argument('--section', required=True, help='CUPS | CONTAINERS | TABLEWARE | FOAM RANGE')
    p.add_argument('--group', required=True)
    p.add_argument('--material', default='')
    p.add_argument('--capacity', default='')
    p.add_argument('--image', default='')
    p.add_argument('--specs', default='', help='"Label=Value;Label=Value"')
    p.set_defaults(fn=cmd_add)

    p = sub.add_parser('remove')
    p.add_argument('--code'); p.add_argument('--id')
    p.set_defaults(fn=cmd_remove)

    p = sub.add_parser('replace-image')
    p.add_argument('--code'); p.add_argument('--id')
    p.add_argument('--image', required=True)
    p.set_defaults(fn=cmd_replace)

    p = sub.add_parser('bulk-images', help='folder of photos named by product code, e.g. "K - 92 - 10.jpg"')
    p.add_argument('--folder', required=True)
    p.set_defaults(fn=cmd_bulk)

    sub.add_parser('rebuild').set_defaults(fn=cmd_rebuild)

    a = ap.parse_args()
    a.fn(a)


if __name__ == '__main__':
    main()

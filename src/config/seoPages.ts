import type { EngineId } from '../engine/types';
import type { PresetId, UserOverrides } from './presets';

export interface Faq {
  q: string;
  a: string;
}

export interface SeoPage {
  slug: string;
  /** <title> text (the site name is appended). */
  title: string;
  h1: string;
  description: string;
  /** Short line under the H1. */
  lead: string;
  tool: 'compressor' | 'zip' | 'merge-pdf' | 'pdf-to-jpg' | 'jpg-to-pdf';
  /**
   * "convert" puts a format picker above the fold and names outputs "photo.webp" rather than
   * "photo-compressed.webp". Set explicitly rather than inferred from overrides.imageFormat, so a
   * compression preset that happens to change format (Website) never turns a page into a converter.
   */
  mode?: 'compress' | 'convert';
  focus?: EngineId;
  preset?: PresetId;
  overrides?: Partial<UserOverrides>;
  guideTitle: string;
  guide: string[];
  faqs: Faq[];
  related: string[];
  /** Breadcrumb parent slug, if any. */
  parent?: string;
}

/** Keeps "100 KB" on one line in headings. */
const NBSP = String.fromCharCode(0xa0);

const PRIVACY_FAQ: Faq = {
  q: 'Are my files uploaded anywhere?',
  a: 'No. Everything happens inside your browser on your own device. Your files are never sent to a server, so nobody else can see them, and there is nothing to delete afterwards.',
};

export const SEO_PAGES: SeoPage[] = [
  {
    slug: 'compress-image',
    title: 'Compress images online (JPG, PNG, WebP, HEIC) — free & private',
    h1: 'Compress images',
    description:
      'Shrink JPG, PNG, WebP, AVIF and HEIC photos in your browser. No uploads, no signup, no limits. Batch compress and download everything as a ZIP.',
    lead: 'Make photos and graphics smaller without visible quality loss. Works on whole folders.',
    tool: 'compressor',
    focus: 'image',
    guideTitle: 'How image compression works here',
    guide: [
      'Drop one photo or a whole folder. Each image is decoded on your device, resized if you asked for it, and re-encoded with modern encoders: MozJPEG for JPEG, OxiPNG for PNG, and libwebp and AVIF for the newer formats. The default "Balanced" goal usually removes 60–80% of a camera photo’s size while looking the same on screen.',
      'If you need a file under a specific size, pick a goal like "Under 100 KB". The tool searches for the highest quality that fits, and only shrinks the dimensions if the target can’t be met otherwise. PNG screenshots and logos can be made much smaller with the "fewer colours" option under More options.',
      'Hidden details such as GPS location and camera model are removed by default, which is safer when you share photos online. You can keep them if you need to. Use the compare slider to check the result up close before you download.',
    ],
    faqs: [
      PRIVACY_FAQ,
      {
        q: 'Which formats are supported?',
        a: 'JPEG, PNG, WebP, AVIF, HEIC (iPhone photos), GIF and BMP. By default each image keeps its format. HEIC is converted to JPEG so it opens everywhere.',
      },
      {
        q: 'Will my photos lose quality?',
        a: 'With the Balanced goal, differences are very hard to see at normal viewing size. Use the compare slider to zoom in and decide for yourself, or move the quality slider towards "Better quality".',
      },
      {
        q: 'Is there a limit on how many images I can compress?',
        a: 'No. There are no daily limits or file caps. Large batches are processed a few at a time so your browser stays responsive.',
      },
      {
        q: 'Should I convert to WebP or AVIF?',
        a: 'For websites, yes: WebP is typically 25–35% smaller than JPEG and works in all modern browsers. AVIF is smaller still but slower to create. For sending to other people, JPEG is the safest choice.',
      },
    ],
    related: [
      'compress-jpg',
      'compress-png',
      'compress-heic',
      'convert-image',
      'compress-image-to-100kb',
    ],
  },
  {
    slug: 'compress-pdf',
    title: 'Compress PDF online — free, private, keeps text selectable',
    h1: 'Compress PDF files',
    description:
      'Reduce PDF file size in your browser. Smart mode shrinks images and keeps text selectable; Scanned mode makes scans tiny. No uploads, no watermark.',
    lead: 'Make PDFs small enough to email or upload, without sending them anywhere.',
    tool: 'compressor',
    focus: 'pdf',
    guideTitle: 'Two ways to shrink a PDF',
    guide: [
      'Most large PDFs are large because of the pictures inside them. In Smart mode, the tool finds every embedded image, lowers its resolution to what is needed for reading and printing (150 DPI on Balanced), and re-encodes it efficiently. Text, links and fonts are left untouched, so you can still select and search the text.',
      'Scanned documents are different: each page is already one big picture. For those, Scanned mode renders every page as a compact image and rebuilds the PDF. It gives the smallest files, but the text can no longer be selected, so the tool only suggests it when your file looks like a scan.',
      'Need to meet an upload limit? Choose "Under 500 KB" or "Custom size" and the tool steps the image quality down until the file fits. PDFs that are mostly text are already small; if compression wouldn’t help, you keep the original.',
    ],
    faqs: [
      PRIVACY_FAQ,
      {
        q: 'Will the text in my PDF still be selectable?',
        a: 'Yes, in Smart mode (the default). Only Scanned mode turns pages into images, and it tells you clearly before you use it.',
      },
      {
        q: 'Can it compress a password-protected PDF?',
        a: 'No. Locked PDFs can’t be changed without the password, and this tool never tries to break encryption. Remove the password in your PDF app first.',
      },
      {
        q: 'Why did my PDF barely get smaller?',
        a: 'PDFs that are mostly text and vector graphics are already compact. The big savings come from photos and scans inside the document.',
      },
      {
        q: 'Is there a page or size limit?',
        a: 'No fixed limit. Very large documents simply take longer, and everything runs on your own device.',
      },
    ],
    related: ['compress-pdf-to-100kb', 'merge-pdf', 'pdf-to-jpg', 'compress-pdf-to-500kb'],
  },
  {
    slug: 'compress-video',
    title: 'Compress video online (MP4, MOV, WebM) — free, no upload',
    h1: 'Compress videos',
    description:
      'Make MP4, MOV, WebM and MKV videos smaller right in your browser using hardware-accelerated encoding. Hit exact sizes for WhatsApp, Discord or email.',
    lead: 'Shrink phone videos and screen recordings without uploading them anywhere.',
    tool: 'compressor',
    focus: 'video',
    guideTitle: 'How video compression works in your browser',
    guide: [
      'Modern browsers can encode video using your computer’s own hardware, the same way video editing apps do. This tool uses that (the WebCodecs API), so even long videos compress quickly and never leave your device. The result is an MP4 that plays everywhere, or WebM if you prefer.',
      'To hit a size limit, pick a goal such as Discord or Email. The tool works out the right bitrate from the video’s length, lowers the resolution if the budget is too tight for sharp HD, and retries if the first attempt comes out slightly too big. For general use, Balanced keeps the original resolution with a sensible quality.',
      'More options lets you choose a resolution (1080p down to 360p), cap the frame rate, or remove the sound entirely, which is handy for screen recordings. Large files are written to temporary browser storage rather than memory, so big videos don’t crash the tab.',
    ],
    faqs: [
      PRIVACY_FAQ,
      {
        q: 'Which browsers can compress video?',
        a: 'Recent versions of Chrome, Edge, Firefox and Safari. If your browser is missing the video features, the page tells you instead of failing silently.',
      },
      {
        q: 'How long does it take?',
        a: 'Usually faster than the video’s own length on a modern laptop, thanks to hardware encoding. A progress bar with a time estimate is shown for each file.',
      },
      {
        q: 'Can I compress a 1 GB video?',
        a: 'Yes. Files are read in pieces and the output is written to temporary storage in your browser, so it doesn’t need to fit in memory.',
      },
      {
        q: 'Why did my video get only slightly smaller?',
        a: 'Videos from streaming services or already-compressed exports are often efficient. Choose a lower resolution or a size goal for bigger savings.',
      },
    ],
    related: [
      'compress-video-for-whatsapp',
      'compress-video-for-discord',
      'compress-video-for-email',
      'compress-audio',
    ],
  },
  {
    slug: 'compress-audio',
    title: 'Compress audio online (MP3, WAV, M4A) — free & private',
    h1: 'Compress audio files',
    description:
      'Convert and shrink MP3, WAV, M4A, AAC, OGG and FLAC files in your browser. Turn huge WAV recordings into small AAC or MP3 files. Nothing is uploaded.',
    lead: 'Shrink recordings, podcasts and voice notes to a size that’s easy to share.',
    tool: 'compressor',
    focus: 'audio',
    guideTitle: 'Choosing the right audio settings',
    guide: [
      'Uncompressed WAV and FLAC files are large: a minute of CD-quality WAV is about 10 MB. Converting to AAC (.m4a) at 128 kbps makes it roughly ten times smaller while still sounding great for music. For speech, podcasts and voice notes, 64 kbps is plenty and smaller again.',
      'By default MP3 files stay MP3 and Ogg files stay Opus, while WAV and FLAC become AAC because it plays everywhere. You can choose MP3 or Opus under More options. Opus gives the best quality for its size, but some older devices can’t play it.',
      'If you need a file under a specific size, choose a goal like Email or set a custom size, and the bitrate is calculated from the length of the recording. Very low bitrates automatically switch to mono, which keeps voices clear.',
    ],
    faqs: [
      PRIVACY_FAQ,
      {
        q: 'Which format should I choose?',
        a: 'AAC (.m4a) for the best balance of size and compatibility, MP3 if the file must play on very old devices, and Opus for the smallest files on modern devices.',
      },
      {
        q: 'Will compressing make my audio sound worse?',
        a: 'At 128 kbps and above, most people can’t hear a difference for music. Lower settings are fine for speech.',
      },
      {
        q: 'Can I compress a long podcast or lecture?',
        a: 'Yes. Files are read in pieces rather than all at once, and the Voice setting (64 kbps) keeps hour-long recordings small.',
      },
      {
        q: 'Does it keep song titles and artwork?',
        a: 'Tags are removed by default for privacy. Untick the "remove hidden details" option to keep them.',
      },
    ],
    related: ['compress-video', 'compress-video-for-email', 'zip'],
  },
  {
    slug: 'zip',
    title: 'Create and open ZIP, RAR and 7z files online — private',
    h1: 'ZIP files and folders, or open archives',
    description:
      'Create ZIP files from files and folders, optionally compressing photos and videos first, and extract ZIP, RAR, 7z and TAR archives. All in your browser.',
    lead: 'Bundle files into one ZIP, or open an archive someone sent you, without uploading anything.',
    tool: 'zip',
    focus: 'archive',
    guideTitle: 'Zipping and unzipping in your browser',
    guide: [
      'Drop files or whole folders to build a ZIP. Folder structure is kept, so the person you send it to sees the same layout. Turn on "Compress first" and photos, PDFs, videos and audio are shrunk before they’re zipped; this matters because ZIP itself can’t make already-compressed files like JPEGs and MP4s much smaller.',
      'To open an archive, drop a ZIP, RAR, 7z, TAR or TAR.GZ file and choose Open. You’ll see what’s inside before extracting, then you can download single files, download everything as a ZIP, or send the contents straight to the compressor.',
      'Password-protected ZIP files are supported: the password is used only on your device to unlock the archive. The extraction engine is loaded only when you open an archive, so the rest of the site stays fast.',
    ],
    faqs: [
      PRIVACY_FAQ,
      {
        q: 'Can I open RAR and 7z files?',
        a: 'Yes. ZIP, RAR (v4 and v5), 7z, TAR and TAR.GZ archives can be opened and extracted.',
      },
      {
        q: 'Why is my ZIP almost as big as the original files?',
        a: 'Photos, videos and PDFs are already compressed, so zipping alone saves little. Turn on "Compress first" to actually shrink them.',
      },
      {
        q: 'Can I create a password-protected ZIP?',
        a: 'Not yet. Opening password-protected archives is supported; creating them is planned.',
      },
      {
        q: 'Is there a size limit?',
        a: 'No fixed limit. Very large archives depend on how much memory your device has.',
      },
    ],
    related: ['compress-image', 'compress-pdf', 'compress-video'],
  },

  // ---------- Target-size pages ----------
  ...(
    [
      ['20', 'u20kb', 'signatures, thumbnails and tiny form fields'],
      ['50', 'u50kb', 'online forms and profile pictures'],
      ['100', 'u100kb', 'job portals, exam forms and ID uploads'],
      ['200', 'u200kb', 'application forms and marketplace listings'],
    ] as const
  ).map(([kb, preset, uses]): SeoPage => ({
    slug: `compress-image-to-${kb}kb`,
    title: `Compress image to ${kb} KB online — JPG & PNG, free`,
    h1: `Compress an image to ${kb}${NBSP}KB`,
    description: `Reduce a photo or image to under ${kb} KB in seconds, right in your browser. Ideal for ${uses}. No uploads and no signup.`,
    lead: `Get any photo under ${kb} KB while keeping it as sharp as possible.`,
    tool: 'compressor',
    focus: 'image',
    preset,
    parent: 'compress-image',
    guideTitle: `Getting a photo under ${kb} KB`,
    guide: [
      `Many websites only accept images below ${kb} KB, which is common for ${uses}. Drop your photo above and the "Under ${kb} KB" goal is already selected. The tool tries different quality levels and keeps the best-looking version that still fits the limit, so you don’t have to guess settings.`,
      Number(kb) <= 50
        ? `${kb} KB is small for a modern phone photo, so the tool will usually also reduce the width and height a little. That’s normal and is what most forms expect anyway: they display images small. If the result looks soft, crop the photo first so only the important part is kept.`
        : `For a typical phone photo, ${kb} KB is reachable without changing its dimensions much. If the image has lots of fine detail, like foliage or text, the tool may shrink it slightly so it still looks clean instead of blocky.`,
      'The file keeps its original format (JPEG stays JPEG, PNG stays PNG), because forms often only accept specific formats. Location and camera details are removed by default. Check the result with the compare slider, then download it.',
    ],
    faqs: [
      PRIVACY_FAQ,
      {
        q: `What if the image is already under ${kb} KB?`,
        a: 'It is kept as it is (minus hidden location and camera details), and marked as already under the target.',
      },
      {
        q: `Can I compress several images to ${kb} KB at once?`,
        a: 'Yes. Drop them all together; each one is compressed to fit the limit and you can download them individually or as one ZIP.',
      },
      {
        q: 'The form also requires specific pixel dimensions. Can I set those?',
        a: 'Yes. Open More options and enter a maximum width and height. The tool resizes first, then compresses to the size limit.',
      },
      {
        q: 'Why does my result look a bit blurry?',
        a: 'Very small size limits leave little room for detail. Cropping the photo to the important area before compressing gives a much sharper result.',
      },
    ],
    related: [
      'compress-image-to-20kb',
      'compress-image-to-50kb',
      'compress-image-to-100kb',
      'compress-image-to-200kb',
      'reduce-photo-size-for-job-application',
    ].filter((s) => s !== `compress-image-to-${kb}kb`),
  })),
  ...(
    [
      ['100kb', '100 KB', 'u100kb'],
      ['200kb', '200 KB', 'u200kb'],
      ['500kb', '500 KB', 'u500kb'],
      ['1mb', '1 MB', 'u1mb'],
    ] as const
  ).map(([slug, label, preset]): SeoPage => ({
    slug: `compress-pdf-to-${slug}`,
    title: `Compress PDF to ${label} online — free, no upload`,
    h1: `Compress a PDF to ${label.replace(' ', NBSP)}`,
    description: `Reduce a PDF to under ${label} for upload portals and email, directly in your browser. Text stays selectable. No watermark, no signup.`,
    lead: `Fit your PDF under ${label} without sending it to anyone.`,
    tool: 'compressor',
    focus: 'pdf',
    preset,
    parent: 'compress-pdf',
    guideTitle: `How to get a PDF under ${label}`,
    guide: [
      `Upload portals for applications, visas, universities and government services often cap PDFs at ${label}. Drop your document above with the "Under ${label}" goal already selected. The tool lowers the resolution and quality of pictures inside the PDF step by step, and stops at the first version that fits, so the document stays as readable as possible.`,
      'Text, signatures made of vector lines, and links are not touched, so the document stays searchable. If your PDF is a scan (every page is a photo), the tool will suggest Scanned mode, which is far more effective for that kind of file.',
      label === '100 KB' || label === '200 KB'
        ? `${label} is tight for a multi-page scan. If the tool can’t reach it, it gives you the smallest version it could make. Splitting the document, or scanning in black and white, will help.`
        : `${label} is comfortable for most documents, so quality usually stays high. PDFs that are mostly text are often already under the limit and are kept as they are.`,
    ],
    faqs: [
      PRIVACY_FAQ,
      {
        q: 'Will the document still be readable?',
        a: 'Yes. Images are reduced only as much as needed to reach the limit. Open the compare view to check the first page before downloading.',
      },
      {
        q: 'What if the tool can’t reach the size?',
        a: 'You get the smallest version possible with a clear note. For scans, try Scanned mode under More options, or split the PDF into parts.',
      },
      {
        q: 'Can I compress a password-protected PDF?',
        a: 'No. Remove the password in your PDF app first; this tool never tries to bypass encryption.',
      },
      {
        q: 'Is there a watermark?',
        a: 'Never. The file you download contains only your document.',
      },
    ],
    related: [
      'compress-pdf',
      'compress-pdf-to-100kb',
      'compress-pdf-to-200kb',
      'compress-pdf-to-500kb',
      'compress-pdf-to-1mb',
    ].filter((s) => s !== `compress-pdf-to-${slug}`),
  })),

  // ---------- Platform video pages ----------
  {
    slug: 'compress-video-for-whatsapp',
    title: 'Compress video for WhatsApp — free, in your browser',
    h1: 'Compress a video for WhatsApp',
    description:
      'Make videos small enough to send on WhatsApp in good quality. Converts to 720p MP4 in your browser, without uploading the video anywhere.',
    lead: 'Send clear videos on WhatsApp without them being crushed or rejected.',
    tool: 'compressor',
    focus: 'video',
    preset: 'whatsapp',
    parent: 'compress-video',
    guideTitle: 'Getting videos ready for WhatsApp',
    guide: [
      'WhatsApp re-compresses videos heavily and limits how large a video message can be, which is why long clips often arrive blurry or can’t be sent at all. Preparing the video yourself gives you control: this preset converts it to 720p MP4 with good quality, which looks sharp on phones and sends quickly.',
      'Drop the video above and the WhatsApp goal is already selected. The conversion runs on your device using hardware acceleration, so even a few minutes of 4K footage finishes in reasonable time. When it’s done, save it to your phone or computer and send it as usual.',
      'If WhatsApp still says the video is too large, trim it or pick a lower resolution under More options. Sending it as a document keeps the quality exactly as you made it.',
    ],
    faqs: [
      PRIVACY_FAQ,
      {
        q: 'What resolution does the WhatsApp preset use?',
        a: '720p, which looks sharp on phone screens and keeps files small. Videos that are already 720p or smaller keep their resolution.',
      },
      {
        q: 'Does it work on my phone?',
        a: 'Yes, in recent Chrome on Android and Safari on iPhone. Very long videos are faster on a computer.',
      },
      {
        q: 'Will the sound be kept?',
        a: 'Yes, audio is kept and converted to AAC. You can remove it under More options.',
      },
      {
        q: 'Is the video uploaded to WhatsApp or anyone else?',
        a: 'No. The file only leaves your device when you choose to send it yourself.',
      },
    ],
    related: ['compress-video', 'compress-video-for-discord', 'compress-video-for-email'],
  },
  {
    slug: 'compress-video-for-discord',
    title: 'Compress video for Discord (under the upload limit) — free',
    h1: 'Compress a video for Discord',
    description:
      'Get any clip under Discord’s free upload limit in your browser. The bitrate is calculated from the video length so it fits first time.',
    lead: 'Fit gameplay clips and recordings under the Discord upload limit.',
    tool: 'compressor',
    focus: 'video',
    preset: 'discord',
    parent: 'compress-video',
    guideTitle: 'Fitting under Discord’s upload limit',
    guide: [
      'Discord limits file uploads for accounts without Nitro, and a few seconds of 1080p gameplay can already be over it. The Discord goal targets just under that limit, leaving a small safety margin. The tool reads the clip’s length, calculates the bitrate that fits, and lowers the resolution if the clip is too long to stay sharp at full HD.',
      'Encoding happens on your graphics hardware through the browser, so it’s quick, and the clip never passes through a third-party server. If the first result lands slightly over the target, the tool automatically tries again a little smaller.',
      'For long recordings, a size limit means low quality. Trimming to the moment that matters, or dropping to 30 fps under More options, keeps the picture much cleaner. Upload limits change from time to time, so check Discord’s current limit if an upload is rejected.',
    ],
    faqs: [
      PRIVACY_FAQ,
      {
        q: 'What size does the Discord preset aim for?',
        a: 'Just under 10 MB, Discord’s long-standing free limit, with a safety margin. The value lives in one config setting and is easy to update if Discord changes it.',
      },
      {
        q: 'My 5-minute clip looks blurry. Why?',
        a: 'Five minutes in under 10 MB leaves very little data per second. Trim the clip or use a larger goal like Email.',
      },
      {
        q: 'Can it keep 60 fps?',
        a: 'Yes, the frame rate is kept unless you cap it. Capping to 30 fps gives each frame more detail at the same size.',
      },
      {
        q: 'What format is the output?',
        a: 'MP4, which Discord previews inline on desktop and mobile.',
      },
    ],
    related: ['compress-video', 'compress-video-for-whatsapp', 'compress-video-for-email'],
  },
  {
    slug: 'compress-video-for-email',
    title: 'Compress video for email (fits Gmail attachments) — free',
    h1: 'Compress a video to send by email',
    description:
      'Shrink a video to fit Gmail and Outlook attachment limits, directly in your browser. No uploads, no account and no watermark.',
    lead: 'Attach videos to email instead of sending a download link.',
    tool: 'compressor',
    focus: 'video',
    preset: 'email',
    parent: 'compress-video',
    guideTitle: 'Making a video small enough to attach',
    guide: [
      'Gmail allows attachments up to 25 MB and Outlook is similar. Anything bigger is turned into a cloud-drive link, which the recipient has to open separately. The Email goal targets 24 MB so there’s room for the email itself, then calculates the bitrate from the video’s length.',
      'Short clips keep their full resolution. Longer videos are reduced to 720p or lower so they still look clean rather than blocky. Everything is done on your own device, which also means you can compress private family videos without handing them to a web service.',
      'If the video is several minutes long, consider trimming it first or sending the highlights. Audio is kept at a quality that’s clear for speech and music.',
    ],
    faqs: [
      PRIVACY_FAQ,
      {
        q: 'Does this work for Outlook and Yahoo too?',
        a: 'Yes. They have similar limits of about 20–25 MB, and the Email goal fits all of them.',
      },
      {
        q: 'How long a video can fit in an email?',
        a: 'Roughly 1–2 minutes at good 720p quality, or longer at lower resolutions.',
      },
      {
        q: 'Can I email other big files the same way?',
        a: 'Yes. The Email goal also works for PDFs, images and audio on the main page.',
      },
      {
        q: 'Will the recipient be able to play it?',
        a: 'Yes. The output is a standard MP4 that plays on phones, Windows and Mac without extra apps.',
      },
    ],
    related: ['compress-video', 'compress-video-for-whatsapp', 'compress-pdf'],
  },

  // ---------- Format pages ----------
  {
    slug: 'compress-jpg',
    title: 'Compress JPG / JPEG online — free, private, no limits',
    h1: 'Compress JPG images',
    description:
      'Reduce JPG and JPEG file size by 60–80% with MozJPEG, right in your browser. Batch compress photos and remove GPS data. No uploads.',
    lead: 'Smaller JPEGs that look the same, made on your device.',
    tool: 'compressor',
    focus: 'image',
    parent: 'compress-image',
    guideTitle: 'Why your JPEGs can be much smaller',
    guide: [
      'Phones and cameras save JPEGs quickly rather than efficiently, so their files are often three to five times larger than they need to be. This tool re-encodes them with MozJPEG, an encoder built by Mozilla to squeeze more out of the JPEG format while keeping it compatible with every device and app.',
      'The Balanced goal is tuned for photos you’ll view on screens and share online. Drag the quality slider towards "Better quality" for prints, or pick a size goal when a website has an upload limit. Progressive encoding is used, so large images start to appear quickly on web pages.',
      'Photos from phones contain your GPS location by default. That data is removed unless you choose to keep it, and the image is rotated correctly first so nothing ends up sideways.',
    ],
    faqs: [
      PRIVACY_FAQ,
      {
        q: 'Is JPG the same as JPEG?',
        a: 'Yes. They’re two file extensions for exactly the same format.',
      },
      {
        q: 'How much smaller will my photos get?',
        a: 'Typically 60–80% for photos straight from a phone or camera. Photos that were already optimised are kept as they are.',
      },
      {
        q: 'Can I keep the EXIF data?',
        a: 'Yes. Untick "remove hidden details" under More options to keep camera and date information.',
      },
      {
        q: 'Should I use WebP instead?',
        a: 'For websites, WebP saves another 25–35%. The tool will suggest it when the saving is worthwhile.',
      },
    ],
    related: ['compress-image', 'compress-png', 'jpg-to-avif', 'compress-image-to-100kb'],
  },
  {
    slug: 'compress-png',
    title: 'Compress PNG online — lossless or smaller palette, free',
    h1: 'Compress PNG images',
    description:
      'Shrink PNG screenshots, logos and graphics losslessly with OxiPNG, or up to 80% with smart colour reduction. Transparency is kept. Private and free.',
    lead: 'Lighter PNGs for websites, docs and apps, with transparency intact.',
    tool: 'compressor',
    focus: 'image',
    parent: 'compress-image',
    guideTitle: 'Lossless vs. palette PNG',
    guide: [
      'PNG is a lossless format, so by default the tool re-packs your image more efficiently with OxiPNG without changing a single pixel. This alone often saves 10–40% on screenshots and exported graphics.',
      'For much bigger savings, turn on "fewer colours" under More options. It reduces the image to a palette of up to 256 carefully chosen colours with subtle dithering, the same trick used by popular PNG tools. For logos, icons, diagrams and most screenshots the difference is invisible, and files often shrink by 60–80%. Transparent areas stay transparent.',
      'If your PNG is actually a photo, PNG is the wrong format for it: the tool will suggest converting to WebP, which is usually dramatically smaller. Choosing a size goal automatically uses the palette method, since lossless PNG can’t trade quality for size.',
    ],
    faqs: [
      PRIVACY_FAQ,
      {
        q: 'Is PNG compression lossless?',
        a: 'Yes by default. The "fewer colours" option is lossy but usually invisible for graphics.',
      },
      {
        q: 'Will transparency be kept?',
        a: 'Yes, both in lossless and palette mode, and when converting to WebP or AVIF.',
      },
      {
        q: 'Why is my PNG photo still large?',
        a: 'PNG isn’t designed for photos. Convert it to JPEG or WebP to make it many times smaller.',
      },
      {
        q: 'Can I compress many screenshots at once?',
        a: 'Yes. Drop a folder of screenshots and download them all as one ZIP.',
      },
    ],
    related: ['compress-image', 'png-to-webp', 'compress-jpg'],
  },
  {
    slug: 'compress-heic',
    title: 'Compress HEIC & convert iPhone photos to JPG — private',
    h1: 'Compress HEIC photos (and convert to JPG)',
    description:
      'Convert iPhone HEIC photos to small, universal JPGs in your browser. Works on Windows and Android. Your photos are never uploaded.',
    lead: 'Turn iPhone photos into small JPGs that open on any device.',
    tool: 'compressor',
    focus: 'image',
    parent: 'compress-image',
    guideTitle: 'Working with iPhone HEIC photos',
    guide: [
      'iPhones save photos as HEIC to save space, but many websites, Windows apps and Android phones can’t open them. Drop your HEIC photos here and they’re converted to JPEG and compressed in the same step, so the result is both compatible and small.',
      'The conversion runs entirely in your browser, which matters for personal photos: they never touch a server. HEIC decoding is heavy, so photos are processed one at a time to keep your device responsive. A batch of holiday photos finishes in a minute or two.',
      'Location data is removed by default, which is good practice before posting photos online. If you’d rather keep the photos in a modern format, choose WebP or AVIF under More options.',
    ],
    faqs: [
      PRIVACY_FAQ,
      {
        q: 'What is a HEIC file?',
        a: 'HEIC is the photo format iPhones use by default. It’s efficient, but not supported everywhere, which is why converting to JPG is so common.',
      },
      {
        q: 'Does converting reduce quality?',
        a: 'Very little at the Balanced setting. The result is a high-quality JPEG that’s usually smaller than the original HEIC.',
      },
      {
        q: 'Can I convert HEIC photos in bulk?',
        a: 'Yes. Drop the whole folder and download all the JPGs as one ZIP.',
      },
      {
        q: 'Will Live Photos keep their motion?',
        a: 'No. Only the still image is converted; the short video part isn’t included.',
      },
    ],
    related: ['compress-image', 'compress-jpg', 'compress-image-to-100kb'],
  },
  {
    slug: 'png-to-webp',
    title: 'Convert PNG to WebP online — free, private, batch',
    h1: 'Convert PNG to WebP',
    description:
      'Convert PNG images to WebP for faster websites, keeping transparency. Batch convert in your browser with no uploads and no limits.',
    lead: 'Much smaller images for the web, with transparency kept.',
    tool: 'compressor',
    mode: 'convert',
    focus: 'image',
    overrides: { imageFormat: 'webp' },
    parent: 'convert-image',
    guideTitle: 'Why convert PNG to WebP',
    guide: [
      'WebP is supported by every modern browser and is usually far smaller than PNG: photos saved as PNG often shrink by 80–90%, and graphics by 25–50%. Transparency is fully supported, so logos and cut-out product shots work exactly as before.',
      'Drop your PNGs and the output format is already set to WebP. Adjust the quality slider under More options if you want an even smaller file, or set a maximum width for images that are bigger than they’ll ever be displayed.',
      'Smaller images mean faster page loads and better Core Web Vitals scores. Keep your original PNGs as masters for editing, and publish the WebP versions.',
    ],
    faqs: [
      PRIVACY_FAQ,
      {
        q: 'Does WebP support transparency?',
        a: 'Yes. Transparent areas in your PNG stay transparent in the WebP.',
      },
      {
        q: 'Do all browsers support WebP?',
        a: 'Yes. All current versions of Chrome, Safari, Firefox and Edge display WebP.',
      },
      {
        q: 'Can I convert WebP back to PNG?',
        a: 'Yes. Drop the WebP file and choose PNG as the format under More options.',
      },
      {
        q: 'Is the conversion lossless?',
        a: 'It uses high-quality lossy WebP by default, which gives the biggest savings with no visible change.',
      },
    ],
    related: ['webp-to-png', 'jpg-to-avif', 'convert-image'],
  },
  {
    slug: 'jpg-to-avif',
    title: 'Convert JPG to AVIF online — smallest images, free',
    h1: 'Convert JPG to AVIF',
    description:
      'Convert JPG photos to AVIF, the most efficient image format, in your browser. Often half the size of JPEG at the same quality. No uploads.',
    lead: 'The smallest possible photos for modern websites.',
    tool: 'compressor',
    mode: 'convert',
    focus: 'image',
    overrides: { imageFormat: 'avif' },
    parent: 'convert-image',
    guideTitle: 'When AVIF makes sense',
    guide: [
      'AVIF is based on the AV1 video codec and is the most efficient image format browsers support today. At the same visual quality, an AVIF file is often around half the size of a JPEG, which makes a real difference on image-heavy websites and for visitors on mobile data.',
      'AVIF takes longer to create than JPEG or WebP, so large photos take a few seconds each. Everything runs on your own device, and big batches are spread across your processor cores.',
      'All current major browsers display AVIF. If you need to support very old browsers or email clients, keep a JPEG fallback, or use WebP, which is nearly as small and faster to create.',
    ],
    faqs: [
      PRIVACY_FAQ,
      {
        q: 'Is AVIF better than WebP?',
        a: 'AVIF files are usually smaller for photos. WebP encodes faster and has slightly wider support. Both are great for the web.',
      },
      {
        q: 'Can I use AVIF in emails or documents?',
        a: 'Not reliably. Many email clients and office apps don’t support it yet. Use JPEG there.',
      },
      {
        q: 'Why is AVIF conversion slower?',
        a: 'The format searches much harder for savings. That’s the price of the smallest file size.',
      },
      {
        q: 'Does AVIF support transparency?',
        a: 'Yes. AVIF supports transparent images, like PNG and WebP.',
      },
    ],
    related: ['png-to-webp', 'webp-to-jpg', 'convert-image'],
  },

  // ---------- Convert pages ----------
  {
    slug: 'convert-image',
    title: 'Convert images online — JPG, PNG, WebP, AVIF, HEIC',
    h1: 'Convert images',
    description:
      'Change an image from one format to another in your browser: JPG, PNG, WebP, AVIF and HEIC in, JPG, PNG, WebP or AVIF out. No uploads, no signup.',
    lead: 'Pick the format you need and convert whole folders at once.',
    tool: 'compressor',
    mode: 'convert',
    focus: 'image',
    overrides: { imageFormat: 'jpeg' },
    guideTitle: 'Which format should you pick?',
    guide: [
      'Choose JPG when something has to open everywhere — forms, printers, older software, email attachments. Choose PNG when you need exact pixels or transparency, such as logos, screenshots and diagrams. Choose WebP for websites: it is roughly 25–35% smaller than JPG at the same quality and keeps transparency. Choose AVIF when you want the very smallest file and can accept slower conversion.',
      'Your file is read on your own device, decoded to raw pixels, and written out again in the format you picked. HEIC photos from an iPhone, AVIF images from a website, WebP downloads and old BMP files can all be read, even when the operating system refuses to open them.',
      'Output can be written as JPG, PNG, WebP or AVIF. There is no GIF, HEIC, ICO or SVG writer here, so those cannot be produced — and animated GIFs cannot be read either.',
    ],
    faqs: [
      PRIVACY_FAQ,
      {
        q: 'Can I convert a whole folder at once?',
        a: 'Yes. Drop a folder, or use the Folder button. Every image is converted and you can download the lot as one ZIP.',
      },
      {
        q: 'Will converting lose quality?',
        a: 'Converting to PNG is lossless. Converting to JPG, WebP or AVIF re-encodes the picture, which is why the quality slider exists under More options. At the default setting the change is not visible on screen.',
      },
      {
        q: 'Can it convert to GIF, HEIC or SVG?',
        a: 'No. Those formats have no writer in this tool, so it will not pretend to offer them. SVG in particular is a drawing format, not a photo format — a converted photo would just be the same photo in a bigger wrapper.',
      },
      {
        q: 'Does converting also make the file smaller?',
        a: 'Usually, yes — especially JPG or PNG to WebP or AVIF. Going to PNG normally makes photos larger, because PNG is lossless.',
      },
    ],
    related: ['heic-to-jpg', 'webp-to-jpg', 'png-to-webp', 'compress-image'],
  },
  {
    slug: 'heic-to-jpg',
    title: 'Convert HEIC to JPG online — free iPhone photo converter',
    h1: 'Convert HEIC to JPG',
    description:
      'Turn iPhone HEIC photos into JPG files that open on any computer. Batch convert in your browser — the photos are never uploaded anywhere.',
    lead: 'Open your iPhone photos anywhere, without installing anything.',
    tool: 'compressor',
    mode: 'convert',
    focus: 'image',
    overrides: { imageFormat: 'jpeg' },
    parent: 'convert-image',
    guideTitle: 'Why iPhone photos won’t open',
    guide: [
      'Since iOS 11, iPhones save photos as HEIC. It is an excellent format — about half the size of JPEG for the same picture — but Windows, older Macs, most web forms and plenty of desktop software still refuse to open it. Converting to JPG solves that in one step.',
      'Drop the .heic files here and they are decoded on your own device and written out as JPG. Your photos are personal, so it matters that nothing is uploaded: there is no server copy to worry about and nothing to delete afterwards.',
      'JPG files are bigger than HEIC, so expect a converted photo to roughly double in size. If you need to stay under an upload limit as well, use the quality slider under More options, or go to the Compress images page and pick a target size.',
    ],
    faqs: [
      PRIVACY_FAQ,
      {
        q: 'Can I convert many HEIC photos at once?',
        a: 'Yes. Add as many as you like, or drop a whole folder, then download them all as a ZIP.',
      },
      {
        q: 'Why are the JPG files bigger than the HEIC ones?',
        a: 'HEIC is a newer, far more efficient format. The same photo as JPG is typically about twice the size. That is the cost of a file that opens everywhere.',
      },
      {
        q: 'Are Live Photos supported?',
        a: 'The still image is converted. The short video attached to a Live Photo is not part of the HEIC file and is not included.',
      },
      {
        q: 'Will the photo be rotated correctly?',
        a: 'Yes. The orientation recorded by the camera is applied to the pixels, so the JPG is upright in every app.',
      },
    ],
    related: ['convert-image', 'compress-heic', 'png-to-jpg'],
  },
  {
    slug: 'webp-to-jpg',
    title: 'Convert WebP to JPG online — free and private',
    h1: 'Convert WebP to JPG',
    description:
      'Turn WebP images downloaded from the web into JPG files that every app and upload form accepts. Batch convert in your browser, no uploads.',
    lead: 'Make a downloaded WebP usable in forms, documents and older apps.',
    tool: 'compressor',
    mode: 'convert',
    focus: 'image',
    overrides: { imageFormat: 'jpeg' },
    parent: 'convert-image',
    guideTitle: 'Why you keep getting WebP files',
    guide: [
      'Most websites now serve images as WebP because it is smaller and loads faster. When you save one, you get a .webp file — and then a form, a printer, a word processor or a photo frame refuses it. JPG is the format everything understands, so converting is usually the quickest fix.',
      'Drop the WebP files here and they are decoded and re-saved as JPG on your own device. The quality slider under More options controls how hard the JPEG encoder works; the default leaves no visible difference.',
      'If the WebP had transparent areas, they are filled with white, because JPEG has no transparency at all. When that matters — a logo, a cut-out product shot — convert to PNG instead.',
    ],
    faqs: [
      PRIVACY_FAQ,
      {
        q: 'What happens to transparency?',
        a: 'JPEG cannot store transparency, so transparent areas become white and you get a warning saying so. Use WebP to PNG if you need to keep them.',
      },
      {
        q: 'Will the JPG be bigger than the WebP?',
        a: 'Often slightly, since WebP is the more efficient format. The difference is usually small at normal quality settings.',
      },
      {
        q: 'Can I convert animated WebP files?',
        a: 'No. Only still images are supported. An animated WebP has no single frame to convert.',
      },
      {
        q: 'Is there a limit on how many I can convert?',
        a: 'No. There is no file count limit, no size limit and no daily cap, because the work happens on your own computer.',
      },
    ],
    related: ['webp-to-png', 'convert-image', 'png-to-jpg'],
  },
  {
    slug: 'webp-to-png',
    title: 'Convert WebP to PNG online — keeps transparency, free',
    h1: 'Convert WebP to PNG',
    description:
      'Convert WebP images to PNG with transparency intact, right in your browser. Lossless output, batch conversion, no uploads and no signup.',
    lead: 'Lossless PNG output, with transparent areas kept exactly as they are.',
    tool: 'compressor',
    mode: 'convert',
    focus: 'image',
    overrides: { imageFormat: 'png' },
    parent: 'convert-image',
    guideTitle: 'When PNG is the right target',
    guide: [
      'Pick PNG over JPG when the image has transparency, or when you need the pixels reproduced exactly: logos, icons, screenshots, diagrams, anything with sharp edges or text. PNG is lossless, so nothing is thrown away and the image can be edited and re-saved without degrading.',
      'Because PNG is lossless, the quality slider has no effect here, and a photograph saved as PNG is usually several times larger than the WebP it came from. That is expected, not a bug — you are trading size for exactness.',
      'If the result is too large and the image is a screenshot, a logo or a diagram, switch on “Shrink PNGs further by using fewer colours” under More options. It reduces the image to a 256-colour palette, which often cuts the size by more than half with no visible change on that kind of picture.',
    ],
    faqs: [
      PRIVACY_FAQ,
      {
        q: 'Is transparency kept?',
        a: 'Yes, completely. PNG stores a full alpha channel, so transparent and semi-transparent areas come through unchanged.',
      },
      {
        q: 'Why is the PNG so much bigger than the WebP?',
        a: 'PNG never discards detail, while WebP normally uses lossy compression. For photographs a PNG can easily be three to five times larger.',
      },
      {
        q: 'Does the quality slider do anything?',
        a: 'Not for PNG output — lossless means there is no quality to trade. The palette option under More options is the way to make a PNG smaller.',
      },
      {
        q: 'Can I convert back to WebP later?',
        a: 'Yes, on the PNG to WebP page. Note that going WebP to PNG and back does not recover detail the first lossy encode removed.',
      },
    ],
    related: ['webp-to-jpg', 'png-to-webp', 'convert-image'],
  },
  {
    slug: 'png-to-jpg',
    title: 'Convert PNG to JPG online — free, private, batch',
    h1: 'Convert PNG to JPG',
    description:
      'Convert PNG images to JPG in your browser for much smaller files and universal compatibility. Batch convert folders, nothing is uploaded.',
    lead: 'Far smaller files for photos and screenshots you only need to share.',
    tool: 'compressor',
    mode: 'convert',
    focus: 'image',
    overrides: { imageFormat: 'jpeg' },
    parent: 'convert-image',
    guideTitle: 'What changes when you go PNG to JPG',
    guide: [
      'PNG stores every pixel exactly, which is perfect for editing and terrible for sharing photographs: a PNG photo is commonly five to ten times larger than the same picture as JPG. If the image is a photo or a screenshot you just need to send, upload or attach, JPG is almost always the better choice.',
      'The conversion happens on your own device. Transparent areas are filled with white, because JPEG has no transparency — the tool tells you when that has happened, so you are never surprised by a black or white box where a cut-out used to be.',
      'Keep your PNG as the master if you will edit the image again. JPEG is lossy, and re-saving a JPEG over and over slowly degrades it.',
    ],
    faqs: [
      PRIVACY_FAQ,
      {
        q: 'What happens to transparent areas?',
        a: 'They are filled with white. JPEG has no transparency channel, so there is nowhere to store them. Convert to WebP instead if you need to keep them.',
      },
      {
        q: 'How much smaller will the JPG be?',
        a: 'For photographs, usually 80–90% smaller. For flat graphics and logos the saving is much smaller, and PNG may even win.',
      },
      {
        q: 'Will I lose quality?',
        a: 'JPEG is lossy, so technically yes. At the default quality the difference is not visible on screen. Lower the quality slider only if you need a much smaller file.',
      },
      {
        q: 'Should I convert screenshots to JPG?',
        a: 'Usually not. Text and sharp lines get fuzzy edges in JPEG. Keep screenshots as PNG, or use WebP for a smaller lossless-looking result.',
      },
    ],
    related: ['jpg-to-png', 'convert-image', 'compress-png'],
  },
  {
    slug: 'jpg-to-png',
    title: 'Convert JPG to PNG online — lossless output, free',
    h1: 'Convert JPG to PNG',
    description:
      'Convert JPG photos to PNG in your browser when a tool or form insists on PNG. Lossless, batch, no uploads and no watermark.',
    lead: 'For the times something only accepts PNG.',
    tool: 'compressor',
    mode: 'convert',
    focus: 'image',
    overrides: { imageFormat: 'png' },
    parent: 'convert-image',
    guideTitle: 'An honest note about JPG to PNG',
    guide: [
      'This conversion does not improve your image, and it is worth saying so plainly. Detail that JPEG compression removed is gone for good; wrapping the result in PNG stores those same pixels exactly, including any JPEG artefacts, in a file that is typically three to five times larger. It does not add transparency either — a JPEG has none to recover.',
      'There is one good reason to do it, and it is a common one: some editor, print service, game asset pipeline, sticker maker or upload form simply refuses anything but PNG. That is what this page is for. Drop the JPGs and you get PNGs out, with nothing uploaded anywhere.',
      'If your goal is a smaller file rather than a particular extension, use Compress JPG instead. If you want a lossless-looking image that is actually small, convert to WebP.',
    ],
    faqs: [
      PRIVACY_FAQ,
      {
        q: 'Does converting to PNG improve the image?',
        a: 'No. PNG stores the pixels the JPEG already had, artefacts and all. It prevents further loss from here on, but it cannot undo past loss.',
      },
      {
        q: 'Will the PNG have transparency?',
        a: 'No. A JPEG has no transparency to carry over. You would need an image editor to cut out a background.',
      },
      {
        q: 'Why is the PNG so much larger?',
        a: 'PNG is lossless. For a photograph that usually means three to five times the size of the JPG it came from.',
      },
      {
        q: 'Can I make the PNG smaller?',
        a: 'Yes — switch on the fewer-colours option under More options. It works very well for graphics and screenshots, less well for photographs.',
      },
    ],
    related: ['png-to-jpg', 'png-to-webp', 'convert-image'],
  },
  {
    slug: 'avif-to-jpg',
    title: 'Convert AVIF to JPG online — free, private, no signup',
    h1: 'Convert AVIF to JPG',
    description:
      'Open AVIF images anywhere by converting them to JPG in your browser. Batch conversion, nothing uploaded, no account needed.',
    lead: 'Make a modern AVIF download work in older apps and forms.',
    tool: 'compressor',
    mode: 'convert',
    focus: 'image',
    overrides: { imageFormat: 'jpeg' },
    parent: 'convert-image',
    guideTitle: 'AVIF is new, and not everything reads it',
    guide: [
      'AVIF is the newest mainstream image format and the most efficient one browsers support. Websites are adopting it quickly, which means more and more saved images land on your disk as .avif — and then a document editor, an upload form or an older phone cannot open them.',
      'Converting to JPG fixes that. The AVIF is decoded on your own device and written out as a JPEG that anything from the last thirty years can read. Expect the JPG to be noticeably larger: that size difference is exactly why websites moved to AVIF.',
      'If you only need the image on the web, consider WebP instead. It is much better supported than AVIF, still far smaller than JPEG, and keeps transparency.',
    ],
    faqs: [
      PRIVACY_FAQ,
      {
        q: 'Why can’t my computer open AVIF files?',
        a: 'Support outside the browser is still patchy. Older versions of Windows, macOS and many desktop apps have no AVIF decoder yet.',
      },
      {
        q: 'How much bigger will the JPG be?',
        a: 'Often roughly twice the size, sometimes more. AVIF is very efficient, so the same picture needs more bytes as JPEG.',
      },
      {
        q: 'Does the AVIF keep its transparency?',
        a: 'Not in a JPG — JPEG has no transparency, so transparent areas are filled with white. Convert to PNG or WebP to keep them.',
      },
      {
        q: 'Can I convert AVIF to PNG instead?',
        a: 'Yes. Pick PNG in the format picker above, and the transparency is preserved.',
      },
    ],
    related: ['convert-image', 'jpg-to-avif', 'webp-to-jpg'],
  },

  // ---------- PDF tools ----------
  {
    slug: 'merge-pdf',
    title: 'Merge PDF files online — free, private, no signup',
    h1: 'Merge PDF files',
    description:
      'Combine several PDFs into one document in your browser. Reorder them before merging, keep text selectable, and never upload a thing.',
    lead: 'Join PDFs into one file, in the order you choose.',
    tool: 'merge-pdf',
    focus: 'pdf',
    guideTitle: 'How merging works here',
    guide: [
      'Every page of every PDF you add is copied into a new document, in the order shown in the list. Nothing is re-rendered and nothing is re-compressed, so text stays selectable and searchable, links keep working, and the quality is identical to the originals. The merged file is roughly the size of its parts added together.',
      'Order matters, and the tool never guesses. Dropped folders arrive in whatever order your operating system hands them over, which is often not alphabetical, so there is a Sort A→Z button and up and down arrows on every row. The first page of each PDF is shown as a thumbnail with its page count, so you can check you have the right file before merging.',
      'If one of your files is locked with a password or is damaged, the merge stops and names that file. It will not quietly hand you a document with a chapter missing.',
    ],
    faqs: [
      PRIVACY_FAQ,
      {
        q: 'Is there a limit on how many PDFs I can merge?',
        a: 'No. There is no file count limit, no page limit and no daily cap. Very large documents simply take a little longer, and the work happens on your own device.',
      },
      {
        q: 'Will the text stay selectable?',
        a: 'Yes. Pages are copied across as they are, so text, links and fonts all survive. Nothing is turned into an image.',
      },
      {
        q: 'Can I merge a password-protected PDF?',
        a: 'No. A locked PDF cannot be read without its password, and this tool never tries to break encryption. Remove the password in your PDF reader first, then merge.',
      },
      {
        q: 'How do I change the order?',
        a: 'Use the up and down arrows on each row, or Sort A→Z to put them in name order. The merged document always follows the list exactly.',
      },
      {
        q: 'The merged file is large. Can I shrink it?',
        a: 'Yes — take the merged PDF over to the Compress PDF page. Merging deliberately does not re-compress anything, so that stays a separate, explicit step.',
      },
    ],
    related: ['compress-pdf', 'jpg-to-pdf', 'pdf-to-jpg'],
  },
  {
    slug: 'pdf-to-jpg',
    title: 'Convert PDF to JPG online — every page as an image, free',
    h1: 'Convert PDF to JPG',
    description:
      'Turn every page of a PDF into a JPG or PNG image, right in your browser. Pick the resolution, then download one page or all of them as a ZIP.',
    lead: 'Every page of your PDF as a separate image.',
    tool: 'pdf-to-jpg',
    focus: 'pdf',
    guideTitle: 'Turning pages into pictures',
    guide: [
      'Each page is rendered exactly as your PDF reader would draw it — text, vectors, images and all — and saved as a picture. That makes it easy to drop a page into a slide deck, a chat message or a document that will not accept a PDF.',
      'Resolution is the one choice that matters. Screen (100 DPI) gives small files that look fine on a phone or monitor. Good (150 DPI) is the sensible default for reading and sharing. Print (300 DPI) is sharp enough to print but produces large files — a 20-page document can easily run to tens of megabytes.',
      'JPG suits pages with photographs and shading. PNG is lossless and keeps text edges crisp, which is better for diagrams and line art, but the files are considerably bigger. Converting to images also flattens the page: the text in the result is a picture of text, so it can no longer be selected, searched or copied.',
    ],
    faqs: [
      PRIVACY_FAQ,
      {
        q: 'Can I download all the pages at once?',
        a: 'Yes. Every page gets its own download button, and there is a “Download all as ZIP” button for the whole set.',
      },
      {
        q: 'Will the text still be selectable?',
        a: 'No. An image is an image. If you need selectable text, keep the PDF — or use Compress PDF, which leaves text intact.',
      },
      {
        q: 'What resolution should I choose?',
        a: 'Good (150 DPI) for almost everything. Choose Print (300 DPI) only if the images are going to paper, and Screen (100 DPI) if you need the smallest files.',
      },
      {
        q: 'Can it handle a password-protected PDF?',
        a: 'No. Locked PDFs cannot be opened without the password, and this tool does not attempt to bypass encryption.',
      },
    ],
    related: ['jpg-to-pdf', 'compress-pdf', 'merge-pdf'],
  },
  {
    slug: 'jpg-to-pdf',
    title: 'Convert JPG to PDF online — free, private, keeps quality',
    h1: 'Convert JPG to PDF',
    description:
      'Turn photos and scans into a single PDF in your browser. Reorder the pages, choose A4, Letter or fit-to-image, and upload nothing.',
    lead: 'One PDF from your photos, one page per image.',
    tool: 'jpg-to-pdf',
    focus: 'image',
    guideTitle: 'From a pile of photos to one document',
    guide: [
      'Every image becomes one page, in the order shown in the list. JPG and PNG files are placed into the PDF exactly as they are, with no re-encoding at all, so a JPG to PDF conversion loses no quality whatsoever and the PDF ends up roughly the size of the photos that went into it. Other formats — HEIC from an iPhone, WebP, AVIF, BMP — are decoded and saved as high-quality JPEG inside the document.',
      'Page size is up to you. “Fit each image” gives every page the shape of its own picture, which is what you usually want for photos. A4 and US Letter produce a normal paper-sized document with the image centred, optionally with a margin — the right choice when the PDF is going to be printed or uploaded to a form that expects a standard page.',
      'Order matters, so dropped folders can be put right with Sort A→Z or the up and down arrows before you build the file. This is the usual way to send a set of phone photos of a document as one tidy attachment.',
    ],
    faqs: [
      PRIVACY_FAQ,
      {
        q: 'Does it reduce the quality of my photos?',
        a: 'Not for JPG or PNG. Those files are embedded byte for byte, so the pages look exactly like the originals. Other formats are converted to high-quality JPEG because PDF cannot store them directly.',
      },
      {
        q: 'Can I use HEIC photos from my iPhone?',
        a: 'Yes. HEIC files are decoded here and added as pages, so you do not need to convert them first.',
      },
      {
        q: 'How do I set the page order?',
        a: 'Use the up and down arrows on each row, or Sort A→Z to order by file name. The PDF follows the list exactly.',
      },
      {
        q: 'The PDF is quite large. What can I do?',
        a: 'That is expected, since the photos are stored at full quality. Run the result through Compress PDF to shrink it, or compress the images first.',
      },
    ],
    related: ['pdf-to-jpg', 'merge-pdf', 'compress-pdf'],
  },

  // ---------- Task pages ----------
  {
    slug: 'reduce-photo-size-for-job-application',
    title: 'Reduce photo size for job and exam applications — free',
    h1: 'Reduce photo size for an online application',
    description:
      'Resize and compress your photo to meet job, exam and government portal limits (20–100 KB). Private, in your browser, no signup.',
    lead: 'Meet strict photo limits on application portals in one step.',
    tool: 'compressor',
    focus: 'image',
    preset: 'u100kb',
    parent: 'compress-image',
    guideTitle: 'Meeting application photo requirements',
    guide: [
      'Recruitment, exam and government portals usually ask for a JPEG photo under a certain size, commonly between 20 KB and 100 KB, and sometimes with specific dimensions. A photo straight from a phone is often 3–5 MB, so it gets rejected.',
      'Drop your photo and the "Under 100 KB" goal is selected. If your form asks for less, pick "Under 50 KB" or "Under 20 KB", or enter the exact limit with Custom size. If specific pixel dimensions are required, enter them as the maximum width and height under More options. The tool resizes first and then finds the best quality that fits.',
      'Crop the photo so your face fills most of the frame before compressing: small limits look much better on a tight crop. Your photo stays on your device the whole time, which is important for identity documents.',
    ],
    faqs: [
      PRIVACY_FAQ,
      {
        q: 'The portal needs a JPG. Will I get a JPG?',
        a: 'Yes, if your photo is a JPG. iPhone HEIC photos are converted to JPG automatically. You can also force JPEG under More options.',
      },
      {
        q: 'What if the size must be between two values, like 20–50 KB?',
        a: 'Choose "Under 50 KB". The tool aims for the best quality just under the limit, which is usually well above the minimum.',
      },
      {
        q: 'Can I also compress my signature?',
        a: 'Yes. See the signature page for the best settings for scanned signatures.',
      },
      {
        q: 'Can I compress documents like certificates too?',
        a: 'Yes. Drop PDFs or scanned images; PDFs can be reduced to 100 KB or 200 KB.',
      },
    ],
    related: [
      'reduce-signature-size',
      'compress-image-to-50kb',
      'compress-image-to-20kb',
      'compress-pdf-to-100kb',
    ],
  },
  {
    slug: 'reduce-signature-size',
    title: 'Reduce signature image size (under 20 KB) — free & private',
    h1: 'Reduce the size of a signature image',
    description:
      'Compress a scanned or photographed signature to under 20 KB for online forms, keeping it crisp. Works in your browser; nothing is uploaded.',
    lead: 'A crisp signature image under 20 KB for any online form.',
    tool: 'compressor',
    focus: 'image',
    preset: 'u20kb',
    parent: 'compress-image',
    guideTitle: 'Getting a clean, small signature',
    guide: [
      'Application forms often ask for a signature image of 10–20 KB, sometimes with dimensions like 140 × 60 pixels. Sign on plain white paper with a dark pen, take a well-lit photo or scan, and crop it tightly around the signature before compressing.',
      'Drop the image with the "Under 20 KB" goal selected. Signatures are simple, high-contrast images, so they compress extremely well and stay sharp. If the form lists exact dimensions, enter them as the maximum width and height under More options.',
      'For the crispest result with a PNG, turn on "fewer colours": a signature needs only a handful of shades, so the file becomes tiny without any blur. Because the tool runs entirely on your device, your signature is never uploaded anywhere.',
    ],
    faqs: [
      PRIVACY_FAQ,
      {
        q: 'Should my signature be JPG or PNG?',
        a: 'Use whatever the form asks for. If both are allowed, PNG with "fewer colours" gives the crispest lines at a tiny size.',
      },
      {
        q: 'How do I get a white background?',
        a: 'Sign on white paper in good light and crop tightly. Most phone scanner apps also clean up the background.',
      },
      {
        q: 'The portal requires at least 10 KB. Is that a problem?',
        a: 'Rarely. Results under 20 KB are usually well above 10 KB. If yours is too small, move the quality slider up under a Custom size goal.',
      },
      {
        q: 'Can I resize to exact pixels?',
        a: 'Set the maximum width and height under More options. The image keeps its proportions.',
      },
    ],
    related: ['reduce-photo-size-for-job-application', 'compress-image-to-20kb', 'compress-png'],
  },
];

export const pageBySlug = (slug: string) => SEO_PAGES.find((p) => p.slug === slug);

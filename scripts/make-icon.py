"""Draw the app's simple original pear-couple mark (requires Pillow)."""
from PIL import Image, ImageDraw
im=Image.new('RGB',(1024,1024),'#FFF9F4');d=ImageDraw.Draw(im)
d.rounded_rectangle((72,72,952,952),radius=230,fill='#E7EFDF')
d.ellipse((180,395,567,835),fill='#749269');d.ellipse((246,285,487,690),fill='#749269')
d.ellipse((455,410,842,850),fill='#F3C6AC');d.ellipse((526,310,767,710),fill='#F3C6AC')
d.line((360,320,390,240),fill='#426C50',width=22);d.ellipse((380,203,496,267),fill='#426C50')
d.line((650,350,623,270),fill='#426C50',width=22)
for x in (301,414,576,689): d.ellipse((x,552,x+23,580),fill='#343C35')
d.arc((342,575,396,627),0,180,fill='#343C35',width=9);d.arc((617,575,671,627),0,180,fill='#343C35',width=9)
d.ellipse((272,596,320,621),fill='#DCAE9F');d.ellipse((702,596,750,621),fill='#DB9BA0')
d.polygon([(518,355),(456,296),(455,267),(477,246),(503,248),(519,268),(537,248),(564,247),(584,267),(584,295)],fill='#B9707B')
im.save('assets/icon.png');im.resize((96,96)).save('assets/favicon.png');im.resize((512,512)).save('assets/splash-icon.png')

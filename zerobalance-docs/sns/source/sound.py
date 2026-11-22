import json,numpy as np,wave
SR=48000
T=json.load(open('times.json'));DUR=T['DUR']
out=np.zeros(int(SR*DUR)+SR)
rng=np.random.default_rng(7)
def bandpass(x,f,q):
    # 2차 공진 필터 (biquad)
    w=2*np.pi*f/SR;al=np.sin(w)/(2*q);b0,b1,b2=al,0,-al;a0,a1,a2=1+al,-2*np.cos(w),1-al
    y=np.zeros_like(x);x1=x2=y1=y2=0.0
    for i,v in enumerate(x):
        o=(b0*v+b1*x1+b2*x2-a1*y1-a2*y2)/a0;x2,x1=x1,v;y2,y1=y1,o;y[i]=o
    return y
def key(gain,pitch):
    n=int(SR*0.045);t=np.arange(n)/SR
    z=rng.standard_normal(n)*np.exp(-t*170)
    s=bandpass(z,2600*pitch,3.0)*1.0+bandpass(z,900*pitch,2.0)*0.6
    # 뗌 소리
    m=int(SR*0.03);t2=np.arange(m)/SR;z2=rng.standard_normal(m)*np.exp(-t2*260)
    r=bandpass(z2,3400*pitch,4.0)*0.35
    full=np.zeros(n+int(SR*0.055)+m);full[:n]+=s;full[int(SR*0.055):int(SR*0.055)+m]+=r
    return full/np.max(np.abs(full))*gain
def tok(gain):
    n=int(SR*0.12);t=np.arange(n)/SR
    f=np.linspace(520,300,n)
    s=np.sin(2*np.pi*np.cumsum(f)/SR)*np.exp(-t*38)
    s+=bandpass(rng.standard_normal(n)*np.exp(-t*90),1800,2)*0.15
    return s/np.max(np.abs(s))*gain
def add(sig,at):
    i=int(at*SR);out[i:i+len(sig)]+=sig[:max(0,len(out)-i)]
for k,t in enumerate(T['CHAR']):
    add(key(0.33*rng.uniform(0.75,1.0),rng.uniform(0.9,1.12)),t)
for t in T['HITS']:add(tok(0.42),t)
out=out[:int(SR*DUR)]
# 끝 0.6초 서서히 줄이기
fl=int(SR*0.6);out[-fl:]*=np.linspace(1,0,fl)
pk=np.max(np.abs(out));out=out/pk*0.79  # 최대 약 -2dB
pcm=(out*32767).astype(np.int16)
with wave.open('sfx.wav','wb') as w:w.setnchannels(1);w.setsampwidth(2);w.setframerate(SR);w.writeframes(pcm.tobytes())
print('keys',len(T['CHAR']),'hits',len(T['HITS']),'sec',DUR)

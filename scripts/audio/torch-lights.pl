# A torch catching: a soft whoosh of noise that opens and settles, with a few crackles as the flame takes.
# Run: perl scripts/audio/torch-lights.pl out.wav && afconvert -f m4af -d aac -b 96000 out.wav src/assets/audio/torch-lights.m4a
use strict; srand(5);
my $sr=44100; my $len=int($sr*1.0); my @out=(0)x$len; my ($lp,$lp2)=(0,0);
for my $k(0..$len-1){
  my $t=$k/$sr;
  # The whoosh: brightness swells over the first 0.15 s and falls back as it settles; loudness follows.
  my $open=$t<0.15 ? $t/0.15 : exp(-($t-0.15)*3);
  my $c=0.02+0.18*$open; my $n=rand()*2-1;
  $lp+=$c*($n-$lp); $lp2+=$c*($lp-$lp2);
  my $env=($t<0.06 ? $t/0.06 : exp(-($t-0.06)*3.5));
  $out[$k]=$lp2*$env*3;
}
# Crackles: short clicks, denser just after the flame takes.
for (1..14){ my $at=int($sr*(0.12+rand()**2*0.8)); my $g=0.25+rand()*0.35;
  for my $j(0..int($sr*0.004)){ last if $at+$j>=$len; $out[$at+$j]+=$g*(rand()*2-1)*exp(-$j/($sr*0.0008)) } }
my $p=0; for(@out){ $p=abs if abs>$p }
my $fade=int($sr*0.1); for my $k(0..$fade-1){ $out[$len-$fade+$k]*=1-$k/$fade }
my $data=pack("s<*",map{int($_/$p*0.89*32767)}@out);
open my $o,'>',$ARGV[0]; binmode $o;
print $o "RIFF",pack("V",36+length $data),"WAVEfmt ",pack("VvvVVvv",16,1,1,$sr,$sr*2,2,16),"data",pack("V",length $data),$data;

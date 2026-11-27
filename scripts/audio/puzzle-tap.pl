# A soft tap for a move on a puzzle board. Variant: wood, stone or pluck.
# Run: perl scripts/audio/puzzle-tap.pl wood out.wav && afconvert -f m4af -d aac -b 96000 out.wav src/assets/audio/puzzle-tap.m4a
use strict; srand(11);
my ($kind,$file)=@ARGV; my $sr=44100; my @out;
if($kind eq 'pluck'){
  # Karplus-Strong on A4, heavily damped so it stops quickly.
  my $len=int($sr*0.25); @out=(0)x$len; my $N=int($sr/440+0.5); my @buf=map{rand()*2-1}1..$N;
  for my $k(0..$len-1){ my $a=$buf[$k%$N]; $buf[$k%$N]=0.97*0.5*($a+$buf[($k+1)%$N]); $out[$k]=$a }
} else {
  # A noise click rung through two resonators: a hollow wooden knock, or a lower dry stone clack.
  my ($f1,$f2,$q,$dur)= $kind eq 'wood' ? (900,2300,0.9965,0.12) : (520,1400,0.993,0.09);
  my $len=int($sr*$dur); @out=(0)x$len;
  for my $r([$f1,1],[$f2,0.4]){ my ($f,$g)=@$r; my $w=2*3.14159265*$f/$sr; my ($y1,$y2)=(0,0);
    for my $k(0..$len-1){ my $x=$k<int($sr*0.003)?(rand()*2-1)*(1-$k/($sr*0.003)):0;
      my $y=$x+2*$q*cos($w)*$y1-$q*$q*$y2; $y2=$y1; $y1=$y; $out[$k]+=$g*$y } }
}
my $lp=0; my $p=0; for(@out){ $lp+=0.5*($_-$lp); $_=$lp; $p=abs if abs>$p }
my $fade=int($sr*0.03); my $len=@out; for my $k(0..$fade-1){ $out[$len-$fade+$k]*=1-$k/$fade }
my $data=pack("s<*",map{int($_/$p*0.89*32767)}@out);
open my $o,'>',$file; binmode $o;
print $o "RIFF",pack("V",36+length $data),"WAVEfmt ",pack("VvvVVvv",16,1,1,$sr,$sr*2,2,16),"data",pack("V",length $data),$data;

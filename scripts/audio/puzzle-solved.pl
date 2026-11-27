# Karplus-Strong plucked string: a rising Hijaz run on D, last note rings.
# Run: perl scripts/audio/puzzle-solved.pl out.wav && afconvert -f m4af -d aac -b 96000 out.wav src/assets/audio/puzzle-solved.m4a
use strict; srand(7);
my $sr=44100; my $len=int($sr*1.6); my @out=(0)x$len;
my @notes=([74,0.00],[75,0.10],[78,0.20],[79,0.30],[81,0.40],[86,0.52],[81,0.52]);
for my $n (@notes){
  my ($m,$t)=@$n; my $f=440*2**(($m-69)/12); my $N=int($sr/$f+0.5);
  my @buf=map{rand()*2-1}1..$N; my $start=int($t*$sr); my $i=0; my $amp=($t>=0.52)?0.7:0.5;
  for(my $k=$start;$k<$len;$k++){ my $a=$buf[$i%$N]; my $b=$buf[($i+1)%$N]; $buf[$i%$N]=0.996*0.5*($a+$b); $out[$k]+=$amp*$a; $i++; }
}
my $lp=0; my $p=0; for(@out){ $lp+=0.35*($_-$lp); $_=$lp; $p=abs if abs>$p }
my $fade=int($sr*0.3); for my $k(0..$fade-1){ $out[$len-$fade+$k]*=1-$k/$fade }
my $data=pack("s<*",map{int($_/$p*0.89*32767)}@out);
open my $o,'>',$ARGV[0]; binmode $o;
print $o "RIFF",pack("V",36+length $data),"WAVEfmt ",pack("VvvVVvv",16,1,1,$sr,$sr*2,2,16),"data",pack("V",length $data),$data;

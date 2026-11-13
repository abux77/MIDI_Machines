#include "machines_sequencer.h"
machines_event_t machines_tick(turing_t *t,transport_t *clock){
 machines_event_t e={.beat=clock->count==0&&clock->phase==0};
 unsigned d=transport_effective_division(clock);
 e.due=clock->count==0&&clock->phase%6==0;
 if(++clock->count>=d){clock->count=0;clock->phase=(clock->phase+1)%24;}
 if(e.due){turing_step(t);for(unsigned p=0;p<2;p++)if(t->machine[p].length)e.hits|=1u<<p;}
 return e;
}

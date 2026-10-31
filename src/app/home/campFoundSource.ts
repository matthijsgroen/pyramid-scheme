import type { CampFound } from "@/ui/atoms/campScene/campTypes"

// What the camp has found, for the scene on the home screen. A mod that owns the finds contributes the
// hook reading them; core only passes the value on. With no source the camp has found nothing (`{}`)
// and shows bare ground. One source: a second registration replaces the first.
type UseCampFound = () => CampFound

let source: UseCampFound | undefined

export const registerCampFoundSource = (useFound: UseCampFound) => {
  source = useFound
}

export const useCampFound = (): CampFound => (source ? source() : {})

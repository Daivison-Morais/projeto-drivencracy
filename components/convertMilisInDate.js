import dayjs from "dayjs";
function convertMilisInDate(milisecunds) {
  const date = new Date(milisecunds);
  const d = new Date(date);
  let dateNoFormat =
    d.getFullYear() +
    "-" +
    (d.getMonth() + 1) +
    "-" +
    d.getDate() +
    " " +
    d.getHours() +
    ":" +
    d.getMinutes();

  const fomatDate = dayjs(dateNoFormat).format("YYYY-MM-DD HH:mm");
  return fomatDate;
}

export default convertMilisInDate;

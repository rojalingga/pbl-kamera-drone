interface RupiahProps {

  value: string | number | null | undefined;
}

const Rupiah = ({ value }: RupiahProps) => {
  return (
    <div className="flex items-center justify-between gap-2">
      <span>Rp.</span>
      <span>{value ?? "-"}</span>
    </div>
  );
};

export default Rupiah;